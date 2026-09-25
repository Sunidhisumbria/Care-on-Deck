/**
 * Uploads: signed by this server, sent by the browser straight to the store.
 *
 * Three calls. Ask to upload -- the server decides where the file will go and
 * signs a short-lived permission for exactly that place. Send the file to the
 * store. Report it done -- the server checks what actually arrived before it
 * records anything.
 *
 * The file never passes through this server. It would be up to 10 MB through a
 * serverless function for no gain, and one more place a document could end up
 * in a log.
 *
 * Nothing the browser says about a file is trusted. Its declared type and size
 * are checked at the start only so a wrong file fails fast; what gets recorded
 * is the store's own inspection of what landed, and a file that breaks the
 * rules is deleted rather than kept.
 */
import { randomUUID } from 'node:crypto';

import { and, eq, inArray, isNull } from 'drizzle-orm';

import {
  FILE_FORMATS,
  UPLOAD_PURPOSES,
  formatBytes,
  formatFromContentType,
  formatList,
  isAllowedFormat,
  type FileFormat,
  type UploadPurpose,
} from '@/lib/uploads';
import type { RequestContext } from '@/server/auth/context';
import { env } from '@/server/config/env';
import { mediaAssets, onboardingSessions, providers } from '@/server/db/schema';
import { withElevated, type Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { consumeRateLimit, RATE_LIMITS } from '@/server/http/ratelimit';
import { fileStorage } from '@/server/integrations';
import { recordAudit } from '@/server/observability/audit';

import type { CompleteUploadInput, CreateUploadInput } from './uploads.schemas';

type MediaRow = typeof mediaAssets.$inferSelect;

/** A recorded upload, as the uploader sees it. Never includes where it is stored. */
export interface UploadedFileView {
  media_id: string;
  purpose: UploadPurpose;
  content_type: string;
  byte_size: number;
}

/** Which `media_assets.kind` each purpose is recorded as. */
const KIND: Record<UploadPurpose, MediaRow['kind']> = {
  license_document: 'license_document',
  provider_headshot: 'provider_headshot',
  certificate: 'other',
  patient_photo: 'patient_photo',
  insurance_card: 'insurance_card',
};

/**
 * Where each upload starts in moderation. A headshot is shown to patients, so
 * it waits in the Photo Review queue. A document is not a photo: left `pending`
 * it would land in that queue too, when it is read as part of the application.
 */
const MODERATION: Record<UploadPurpose, MediaRow['moderationStatus']> = {
  license_document: 'auto_approved',
  provider_headshot: 'pending',
  certificate: 'auto_approved',
  // Neither is ever shown to anyone but the patient and the practice they book
  // with, so neither belongs in the public Photo Review queue.
  patient_photo: 'auto_approved',
  insurance_card: 'auto_approved',
};

/** Long enough to open the file; short enough that a forwarded link is soon useless. */
const VIEW_LINK_SECONDS = 5 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_SET_UP = 'File upload is not set up yet.';

export const uploadsService = {
  async create(tx: Tx, ctx: RequestContext, input: CreateUploadInput) {
    const session = requireSession(ctx);
    const rules = UPLOAD_PURPOSES[input.purpose];

    if (!isAllowedFormat(input.purpose, formatFromContentType(input.content_type))) {
      throw fieldError('content_type', `Upload a ${formatList(rules.formats)} file.`);
    }
    if (input.byte_size > rules.maxBytes) {
      throw fieldError('byte_size', `That file is too large. The limit is ${formatBytes(rules.maxBytes)}.`);
    }

    // Who may upload is decided before whether uploading works at all, so a
    // caller who should not be here is told that, not that storage is off.
    await assertMayUpload(tx, session, input.purpose);

    if (!fileStorage.isConfigured()) throw new ApiError('NOT_IMPLEMENTED', NOT_SET_UP);

    await consumeRateLimit(
      `uploads:user:${session.userId}`,
      RATE_LIMITS.uploadsPerUser,
      'Too many uploads. Please wait an hour and try again.',
    );

    const key = `${keyPrefix(input.purpose, session.userId)}${randomUUID()}`;
    const upload = fileStorage.createUpload({ key, formats: rules.formats });

    return {
      key,
      upload: { url: upload.url, fields: upload.fields, expires_at: upload.expiresAt },
      max_bytes: rules.maxBytes,
    };
  },

  async complete(tx: Tx, ctx: RequestContext, input: CompleteUploadInput): Promise<UploadedFileView> {
    const session = requireSession(ctx);
    const rules = UPLOAD_PURPOSES[input.purpose];

    // Keys this server issued to this person for this purpose all start the same
    // way. Anything else is someone else's upload, or a guess.
    if (!input.key.startsWith(keyPrefix(input.purpose, session.userId))) {
      throw ApiError.notFound('That upload was not found.');
    }

    // Reporting the same upload twice -- a retry after a dropped response --
    // returns what was recorded the first time.
    const existing = await withElevated(tx, async () => {
      const [row] = await tx.select().from(mediaAssets).where(eq(mediaAssets.storageKey, input.key)).limit(1);
      return row ?? null;
    });
    if (existing) return toView(existing, input.purpose);

    if (!fileStorage.isConfigured()) throw new ApiError('NOT_IMPLEMENTED', NOT_SET_UP);

    const stored = await fileStorage.inspect(input.key);
    if (!stored) throw ApiError.notFound('That upload was not found. Try uploading the file again.');

    const format = normaliseFormat(stored.format);
    if (!isAllowedFormat(input.purpose, format) || stored.bytes > rules.maxBytes) {
      await fileStorage.remove(input.key);
      throw new ApiError(
        'VALIDATION_FAILED',
        `That file was not accepted. Upload a ${formatList(rules.formats)} file up to ${formatBytes(rules.maxBytes)}.`,
      );
    }

    const [row] = await withElevated(tx, () =>
      tx
        .insert(mediaAssets)
        .values({
          kind: KIND[input.purpose],
          storageKey: input.key,
          contentType: FILE_FORMATS[format].contentType,
          byteSize: stored.bytes,
          width: stored.width,
          height: stored.height,
          uploadedByUserId: session.userId,
          moderationStatus: MODERATION[input.purpose],
        })
        .returning(),
    );
    if (!row) throw ApiError.internal('Could not record the upload.');

    await recordAudit(tx, ctx, {
      action: 'media.uploaded',
      resourceType: 'media_asset',
      resourceId: row.id,
      metadata: { purpose: input.purpose, bytes: stored.bytes },
    });

    return toView(row, input.purpose);
  },

  /**
   * A short-lived link to open a file. For the person who uploaded it, and for
   * CareOndeck staff reviewing their application. Anyone else is told the file
   * does not exist -- the same answer as a wrong id, so ids cannot be probed.
   */
  async viewLink(tx: Tx, ctx: RequestContext, mediaId: string): Promise<{ url: string; expires_at: string }> {
    const session = requireSession(ctx);

    const media = UUID.test(mediaId)
      ? await withElevated(tx, async () => {
          const [row] = await tx
            .select()
            .from(mediaAssets)
            .where(and(eq(mediaAssets.id, mediaId), isNull(mediaAssets.deletedAt)))
            .limit(1);
          return row ?? null;
        })
      : null;

    if (!media || !(media.uploadedByUserId === session.userId || ctx.isInternal)) {
      throw ApiError.notFound('That file was not found.');
    }

    if (!fileStorage.isConfigured()) throw new ApiError('NOT_IMPLEMENTED', NOT_SET_UP);

    const url = fileStorage.viewUrl({
      key: media.storageKey,
      format: formatFromContentType(media.contentType) ?? 'pdf',
      expiresInSeconds: VIEW_LINK_SECONDS,
    });

    await recordAudit(tx, ctx, {
      action: 'media.viewed',
      resourceType: 'media_asset',
      resourceId: media.id,
      metadata: { kind: media.kind },
    });

    return { url, expires_at: new Date(Date.now() + VIEW_LINK_SECONDS * 1000).toISOString() };
  },
};

/**
 * A file the user uploaded for this purpose, or null. For steps that attach an
 * upload -- the license document -- so an id pasted from someone else's
 * application, or a headshot passed off as a license, is refused.
 */
export async function ownedFile(
  tx: Tx,
  userId: string,
  mediaId: string,
  purpose: UploadPurpose,
): Promise<UploadedFileView | null> {
  if (!UUID.test(mediaId)) return null;

  const row = await withElevated(tx, async () => {
    const [found] = await tx
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.id, mediaId),
          eq(mediaAssets.uploadedByUserId, userId),
          eq(mediaAssets.kind, KIND[purpose]),
          isNull(mediaAssets.deletedAt),
        ),
      )
      .limit(1);
    return found ?? null;
  });

  return row ? toView(row, purpose) : null;
}

async function assertMayUpload(
  tx: Tx,
  session: NonNullable<RequestContext['session']>,
  purpose: UploadPurpose,
): Promise<void> {
  const forPatient: readonly UploadPurpose[] = ['patient_photo', 'insurance_card'];
  if (forPatient.includes(purpose)) {
    if (session.userType !== 'patient') {
      throw ApiError.forbidden(`Only patient accounts can upload a ${UPLOAD_PURPOSES[purpose].label.toLowerCase()}.`);
    }
    return;
  }

  // The rest belong to a provider application.
  const forApplication: readonly UploadPurpose[] = ['license_document', 'provider_headshot', 'certificate'];
  if (forApplication.includes(purpose)) {
    const label = UPLOAD_PURPOSES[purpose].label.toLowerCase();
    if (session.userType !== 'provider') {
      throw ApiError.forbidden(`Only provider accounts can upload a ${label}.`);
    }

    const [application] = await tx
      .select({ id: onboardingSessions.id })
      .from(onboardingSessions)
      .where(
        and(
          eq(onboardingSessions.userId, session.userId),
          eq(onboardingSessions.kind, 'provider'),
          inArray(onboardingSessions.status, ['in_progress', 'needs_changes']),
        ),
      )
      .limit(1);

    if (application) return;

    // An approved provider keeps their profile current from Personal
    // Information: a new photo goes through photo review, and a changed
    // license returns to the reviewer as pending.
    const [provider] = await withElevated(tx, () =>
      tx
        .select({ id: providers.id })
        .from(providers)
        .where(and(eq(providers.userId, session.userId), isNull(providers.deletedAt)))
        .limit(1),
    );
    if (provider) return;

    throw ApiError.conflict(`A ${label} is uploaded as part of an open provider application.`);
  }
}

/**
 * Where a user's uploads for a purpose live. The environment is part of it so
 * local testing and production can share one storage account without mixing.
 */
function keyPrefix(purpose: UploadPurpose, userId: string): string {
  return `careondeck/${env.APP_ENV}/${purpose}/${userId}/`;
}

function normaliseFormat(format: string): FileFormat | null {
  const lower = format.toLowerCase();
  if (lower === 'jpeg') return 'jpg';
  return lower in FILE_FORMATS ? (lower as FileFormat) : null;
}

function toView(row: MediaRow, purpose: UploadPurpose): UploadedFileView {
  return { media_id: row.id, purpose, content_type: row.contentType, byte_size: row.byteSize };
}

function fieldError(path: string, message: string): ApiError {
  return new ApiError('VALIDATION_FAILED', message, { details: [{ path, message }] });
}

function requireSession(ctx: RequestContext) {
  if (!ctx.session) throw ApiError.unauthenticated();
  return ctx.session;
}
