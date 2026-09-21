
import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { AcceptedInsuranceValues } from '@/lib/accepted-insurance';
import { licenseMatchesRegistry, type LicenseValues } from '@/lib/license';
import { profileFlags, type NpiLookupAnswer, type NpiProfile, type ProviderTypeKey } from '@/lib/npi';
import { normalizeUsPhone, normalizeWebsite, type PracticeValues } from '@/lib/practice';
import type { ProfileValues } from '@/lib/profile';
import { timezoneForState } from '@/lib/us-states';
import type { RequestContext } from '@/server/auth/context';
import { env } from '@/server/config/env';
import { insuranceCarriers, onboardingSessions, providers, users } from '@/server/db/schema';
import { withElevated, type Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { consumeRateLimit, RATE_LIMITS } from '@/server/http/ratelimit';
import { nppes, type NpiRecord } from '@/server/integrations';
import { ownedFile, type UploadedFileView } from '@/server/modules/uploads/uploads.service';
import { recordAudit } from '@/server/observability/audit';

import { AUTO_APPROVAL_NOTE, approveApplication, flaggedApprovalNote } from './approve';
import { submitApplication } from './submit';
import {
  AUTOMATIC_STEPS,
  EDITABLE_STATUSES,
  INVALIDATES,
  PROVIDER_STEP_DATA,
  PROVIDER_STEPS,
  STEP_IDENTITY,
  type NpiLookupQuery,
  type ProviderStep,
  type SaveStepInput,
  type StartOnboardingInput,
  type SubmitApplicationInput,
} from './onboarding.schemas';

type SessionRow = typeof onboardingSessions.$inferSelect;

export interface OnboardingSessionView {
  id: string;
  kind: SessionRow['kind'];
  status: SessionRow['status'];
  current_step: string;
  completed_steps: string[];
  draft: Record<string, unknown>;
  reviewer_note: string | null;
  submitted_at: string | null;
  last_active_at: string;
}


interface ReviewSignals {
  npi_in_use_elsewhere: boolean;
  matches_unclaimed_profile: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TOO_MANY_LOOKUPS = 'Too many NPI lookups. Please wait an hour and try again.';

export const onboardingService = {
  /** The caller's provider application, or null if they have none. */
  async getCurrent(tx: Tx, ctx: RequestContext): Promise<OnboardingSessionView | null> {
    const { userId } = requireSession(ctx);

    const [row] = await tx
      .select()
      .from(onboardingSessions)
      .where(
        and(
          eq(onboardingSessions.userId, userId),
          eq(onboardingSessions.kind, 'provider'),
          ne(onboardingSessions.status, 'abandoned'),
        ),
      )
      .orderBy(desc(onboardingSessions.createdAt))
      .limit(1);

    return row ? toView(row) : null;
  },

 
  async start(
    tx: Tx,
    ctx: RequestContext,
    input: StartOnboardingInput,
  ): Promise<OnboardingSessionView> {
    const session = requireSession(ctx);

    if (input.kind === 'office') {
      throw new ApiError('NOT_IMPLEMENTED', 'Office onboarding is not available yet.');
    }
    if (session.userType !== 'provider') {
      throw ApiError.forbidden('Provider onboarding is only available to provider accounts.');
    }

    const existing = await this.getCurrent(tx, ctx);
    if (existing) return existing;

    const [row] = await tx
      .insert(onboardingSessions)
      .values({
        kind: 'provider',
        userId: session.userId,
        completedSteps: [...AUTOMATIC_STEPS],
        currentStep: nextStep(AUTOMATIC_STEPS),
      })
      .returning();
    if (!row) throw ApiError.internal('Could not start onboarding.');

    await recordAudit(tx, ctx, {
      action: 'onboarding.started',
      resourceType: 'onboarding_session',
      resourceId: row.id,
      metadata: { kind: 'provider' },
    });

    return toView(row);
  },

  async get(tx: Tx, ctx: RequestContext, id: string): Promise<OnboardingSessionView> {
    const { userId } = requireSession(ctx);
    const row = await findOwn(tx, userId, id);
    if (!row) throw ApiError.notFound('No onboarding application found.');
    return toView(row);
  },

 
  async saveStep(
    tx: Tx,
    ctx: RequestContext,
    id: string,
    input: SaveStepInput,
  ): Promise<OnboardingSessionView> {
    const { userId } = requireSession(ctx);
    const row = await findOwn(tx, userId, id);
    if (!row) throw ApiError.notFound('No onboarding application found.');

    if (!EDITABLE_STATUSES.includes(row.status)) {
      throw ApiError.conflict('This application has been submitted and can no longer be changed.');
    }

    const { step } = input;
    if (AUTOMATIC_STEPS.includes(step) || step === 'submit_for_review') {
      throw new ApiError('VALIDATION_FAILED', 'That step cannot be saved directly.', {
        details: [{ path: 'step', message: 'That step cannot be saved directly.' }],
      });
    }

    const completed = row.completedSteps;
    const unfinished = PROVIDER_STEPS.slice(0, PROVIDER_STEPS.indexOf(step)).find(
      (earlier) => !completed.includes(earlier),
    );
    if (unfinished) {
      throw ApiError.conflict('Finish the earlier steps first.');
    }

    const schema = PROVIDER_STEP_DATA[step];
    if (!schema) {
      throw new ApiError('NOT_IMPLEMENTED', 'That step is not available yet.');
    }

    const parsed = schema.safeParse(input.data);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_FAILED', 'Check the highlighted fields.', {
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join('.') : step,
          message: issue.message,
        })),
      });
    }

    const answer = await buildAnswer(tx, userId, step, parsed.data as Record<string, unknown>, row);

    const draft: Record<string, unknown> = { ...row.draft };
    const previous = draft[step];
    draft[step] = answer;

    let nextCompleted: string[] = completed.includes(step) ? [...completed] : [...completed, step];

    // Only a real change invalidates. Re-saving the same answer must not throw
    // away work the applicant has already done further along.
    const identity = STEP_IDENTITY[step] ?? ((value: unknown) => value);
    if (previous !== undefined && !sameAnswer(identity(previous), identity(answer))) {
      const stale: readonly string[] = INVALIDATES[step] ?? [];
      for (const key of stale) delete draft[key];
      nextCompleted = nextCompleted.filter((key) => !stale.includes(key));
    }

    // Flow order, regardless of the order steps happened to be saved in.
    nextCompleted = PROVIDER_STEPS.filter((key) => nextCompleted.includes(key));

    const now = new Date();
    const [updated] = await tx
      .update(onboardingSessions)
      .set({
        draft,
        completedSteps: nextCompleted,
        currentStep: nextStep(nextCompleted),
        lastActiveAt: now,
        updatedAt: now,
      })
      .where(eq(onboardingSessions.id, row.id))
      .returning();
    if (!updated) throw ApiError.internal('Could not save that step.');

    if (step === 'confirm_profile') {
      await recordAudit(tx, ctx, {
        action: 'onboarding.profile_confirmed',
        resourceType: 'onboarding_session',
        resourceId: row.id,
        metadata: {
          npi: (row.draft.npi_lookup as { npi?: string } | undefined)?.npi ?? null,
          flags: (answer as { flags?: unknown }).flags ?? [],
        },
      });
    }

    return toView(updated);
  },

  /**
   * IA: 4/5. Onboarding > Submit for Review
   *
   * Every step must be complete, and the NPI is checked for a claim once more:
   * another applicant may have submitted the same number since this one looked
   * it up, and only one of them can have it.
   */
  async submitForReview(
    tx: Tx,
    ctx: RequestContext,
    id: string,
    _input: SubmitApplicationInput,
  ): Promise<OnboardingSessionView> {
    const { userId } = requireSession(ctx);
    const row = await findOwn(tx, userId, id);
    if (!row) throw ApiError.notFound('No onboarding application found.');

    if (!EDITABLE_STATUSES.includes(row.status)) {
      throw ApiError.conflict('This application has already been submitted.');
    }
    if (nextStep(row.completedSteps) !== 'submit_for_review') {
      throw ApiError.conflict('Finish every step before submitting.');
    }

    const npi = (row.draft.npi_lookup as { npi?: string } | undefined)?.npi;
    if (npi) await assertNpiNotClaimed(tx, userId, npi);

    const submitted = await submitApplication(tx, ctx, row, userId);

    // Local and staging only, until Control Center approvals exist. env.ts
    // refuses this setting in production.
    if (!env.PROVIDER_AUTO_APPROVE) return toView(submitted);

    // Auto-approval is there so the flow can be walked without a reviewer, not
    // to wave through an application our own checks disagreed with. An NPI
    // registered to somebody else is exactly what a reviewer exists to catch,
    // so it waits for one -- unless PROVIDER_AUTO_APPROVE_FLAGGED says the
    // environment is for testing later flows with borrowed NPIs.
    const held = heldFlags(submitted);
    if (held.length > 0 && !env.PROVIDER_AUTO_APPROVE_FLAGGED) {
      return toView(await holdForReview(tx, submitted, held));
    }

    return toView(
      await approveApplication(tx, ctx, submitted, {
        decidedByUserId: null,
        note: held.length > 0 ? flaggedApprovalNote(held) : AUTO_APPROVAL_NOTE,
        automatic: true,
      }),
    );
  },

  /**
   * What the registry holds for a number. Read-only: it does not save the NPI
   * to an application or check whether anyone has claimed it.
   *
   * Unlike saving the step, a registry outage is not softened here -- there is
   * nothing to continue with, so the caller is told to try again.
   */
  async lookupNpi(tx: Tx, ctx: RequestContext, query: NpiLookupQuery): Promise<{ profile: NpiProfile }> {
    const { userId } = requireSession(ctx);
    await consumeRateLimit(`npi:lookup:user:${userId}`, RATE_LIMITS.npiLookupPerUser, TOO_MANY_LOOKUPS);
    return { profile: toProfile(assertUsable(await nppes.lookupByNpi(query.npi))) };
  },
};

/**
 * Flags that keep an application in the queue even when auto-approval is on.
 *
 * Each one means an automatic check disagreed with the applicant, and none of
 * them is refused outright: a married name or an unreachable registry is
 * usually innocent. What they cannot be is approved by nobody.
 */
const HELD_FLAGS = ['name_mismatch', 'role_mismatch', 'registry_unavailable'] as const;

type HeldFlag = (typeof HELD_FLAGS)[number];

const HOLD_REASON: Record<HeldFlag, string> = {
  name_mismatch: 'the name on this NPI record does not match the name on the account',
  role_mismatch: 'the registry lists a different kind of provider than the one chosen',
  registry_unavailable: 'the NPI registry could not be reached to check this number',
};

function heldFlags(session: SessionRow): HeldFlag[] {
  const confirmed = session.draft.confirm_profile as { flags?: unknown } | undefined;
  const flags = Array.isArray(confirmed?.flags) ? confirmed.flags : [];

  return HELD_FLAGS.filter((flag) => flags.includes(flag));
}

/**
 * Leaves the application submitted and says why it is waiting.
 *
 * The note is what the applicant reads on their status screen, so it is
 * written for them: what we could not confirm, not which flag fired.
 */
async function holdForReview(tx: Tx, session: SessionRow, flags: HeldFlag[]): Promise<SessionRow> {
  const reasons = flags.map((flag) => HOLD_REASON[flag]);
  const note =
    reasons.length === 1
      ? `A member of our team is checking this application, because ${reasons[0]}.`
      : `A member of our team is checking this application, because ${reasons.slice(0, -1).join(', ')} and ${reasons.at(-1)}.`;

  const [row] = await tx
    .update(onboardingSessions)
    .set({ reviewerNote: note, updatedAt: new Date() })
    .where(eq(onboardingSessions.id, session.id))
    .returning();

  return row ?? session;
}

/** The first step still to do, in flow order. */
export function nextStep(completed: readonly string[]): ProviderStep {
  return (
    PROVIDER_STEPS.find((step) => step === 'submit_for_review' || !completed.includes(step)) ??
    'submit_for_review'
  );
}

/**
 * What is stored for a step. Most steps store what was sent; the NPI steps store
 * what the server worked out from it.
 */
async function buildAnswer(
  tx: Tx,
  userId: string,
  step: ProviderStep,
  data: Record<string, unknown>,
  row: SessionRow,
): Promise<Record<string, unknown>> {
  if (step === 'npi_lookup') return lookupForApplication(tx, userId, String(data.npi));
  if (step === 'confirm_profile') return confirmForApplication(tx, userId, row);
  if (step === 'license_verification') return licenseForApplication(tx, userId, data as LicenseValues, row);
  if (step === 'practice_setup') return practiceForApplication(data as PracticeValues);
  if (step === 'insurance_setup') return insuranceForApplication(tx, data as AcceptedInsuranceValues);
  if (step === 'photo_uploads') return profileForApplication(tx, userId, data as ProfileValues);
  return data;
}

/**
 * The practice in the form it will be stored in: one phone format so numbers
 * can be compared, a website with its scheme, and the time zone its hours are
 * in -- worked out from the state, so the applicant is not asked.
 */
function practiceForApplication(data: PracticeValues): Record<string, unknown> {
  return {
    name: data.name.replace(/\s+/g, ' '),
    office_type: data.office_type,
    phone: normalizeUsPhone(data.phone),
    email: data.email.toLowerCase(),
    website: normalizeWebsite(data.website),
    address: {
      line1: data.address_line1,
      line2: data.address_line2 || null,
      city: data.city,
      state: data.state,
      postal_code: data.postal_code,
    },
    timezone: timezoneForState(data.state),
  };
}

/**
 * Stores each carrier's name with its id, so the summary can be shown without
 * another lookup. A carrier that does not exist, or that staff have retired
 * from the directory, is refused rather than silently dropped.
 */
async function insuranceForApplication(tx: Tx, data: AcceptedInsuranceValues): Promise<Record<string, unknown>> {
  if (data.self_pay_only) return { self_pay_only: true, carriers: [] };

  const found = await tx
    .select({ id: insuranceCarriers.id, name: insuranceCarriers.name })
    .from(insuranceCarriers)
    .where(and(inArray(insuranceCarriers.id, data.carrier_ids), eq(insuranceCarriers.isActive, true)));
  const byId = new Map(found.map((carrier) => [carrier.id, carrier]));

  const carriers = data.carrier_ids.map((carrierId) => byId.get(carrierId));
  if (carriers.some((carrier) => !carrier)) {
    throw fieldError('carrier_ids', 'One of those carriers is no longer listed. Refresh the page and choose again.');
  }

  return { self_pay_only: false, carriers };
}

/** Like the license document: every attached file must be this applicant's own upload for that purpose. */
async function profileForApplication(tx: Tx, userId: string, data: ProfileValues): Promise<Record<string, unknown>> {
  let headshot: UploadedFileView | null = null;
  if (data.headshot_media_id) {
    headshot = await ownedFile(tx, userId, data.headshot_media_id, 'provider_headshot');
    if (!headshot) throw fieldError('headshot_media_id', 'That photo could not be found. Upload it again.');
  }

  const certificates: UploadedFileView[] = [];
  for (const mediaId of data.certificate_media_ids) {
    const certificate = await ownedFile(tx, userId, mediaId, 'certificate');
    if (!certificate) {
      throw fieldError('certificate_media_ids', 'A certificate could not be found. Upload it again.');
    }
    certificates.push(certificate);
  }

  return { headshot, bio: data.bio, years_experience: data.years_experience, certificates };
}

function fieldError(path: string, message: string): ApiError {
  return new ApiError('VALIDATION_FAILED', message, { details: [{ path, message }] });
}

/**
 * Resolves an NPI for an application.
 *
 * Ownership is checked before the registry is asked: an NPI that is already
 * someone else's is refused however valid it is. The rate limit comes first of
 * all, because the ownership answer is itself something worth probing for.
 *
 * A registry outage does not stop the applicant. The number is stored with no
 * record, the confirmation step says the registry could not be reached, and the
 * reviewer is told why the profile was not matched. Anything else the registry
 * says -- no such NPI, an organization's NPI, an inactive one -- is refused on
 * the field, because those are the applicant's to fix.
 */
async function lookupForApplication(tx: Tx, userId: string, npi: string): Promise<Record<string, unknown>> {
  await consumeRateLimit(`npi:lookup:user:${userId}`, RATE_LIMITS.npiLookupPerUser, TOO_MANY_LOOKUPS);
  await assertNpiNotClaimed(tx, userId, npi);

  let profile: NpiProfile | null = null;
  let registryUnavailable = false;
  try {
    profile = toProfile(assertUsable(await nppes.lookupByNpi(npi)));
  } catch (error) {
    if (!(error instanceof ApiError && error.code === 'INTEGRATION_UNAVAILABLE')) throw error;
    registryUnavailable = true;
  }

  const answer: NpiLookupAnswer & { review: ReviewSignals } = {
    npi,
    profile,
    registry_unavailable: registryUnavailable,
    looked_up_at: new Date().toISOString(),
    review: await reviewSignals(tx, userId, npi),
  };
  return answer as unknown as Record<string, unknown>;
}

/** Records the applicant's yes, and what the reviewer should look at because of it. */
async function confirmForApplication(tx: Tx, userId: string, row: SessionRow): Promise<Record<string, unknown>> {
  const lookup = row.draft.npi_lookup as NpiLookupAnswer | undefined;
  if (!lookup) throw ApiError.conflict('Look up your NPI before confirming it.');

  const account = await withElevated(tx, async () => {
    const [found] = await tx
      .select({ first_name: users.firstName, last_name: users.lastName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return found ?? { first_name: null, last_name: null };
  });

  const providerType =
    (row.draft.select_role as { provider_type?: ProviderTypeKey } | undefined)?.provider_type ?? null;

  return {
    confirmed: true,
    confirmed_at: new Date().toISOString(),
    flags: profileFlags({ lookup, account, providerType }),
  };
}

/**
 * Stores the license as entered, and whether it agrees with the NPI record.
 *
 * A disagreement is recorded, not refused. The registry's license field is typed
 * in by the provider and often lags a renewal or a move, so a mismatch is more
 * often a stale record than a false claim -- but it is exactly what a reviewer
 * should check against the state board, so it is kept where they will see it.
 */
async function licenseForApplication(
  tx: Tx,
  userId: string,
  data: LicenseValues,
  row: SessionRow,
): Promise<Record<string, unknown>> {
  const registry = (row.draft.npi_lookup as NpiLookupAnswer | undefined)?.profile?.primary_taxonomy ?? null;

  // An attached document must be this applicant's own license upload -- not an
  // id copied from someone else's application, nor a headshot passed off as one.
  let document: UploadedFileView | null = null;
  if (data.document_media_id) {
    document = await ownedFile(tx, userId, data.document_media_id, 'license_document');
    if (!document) {
      const message = 'That document could not be found. Upload it again.';
      throw new ApiError('VALIDATION_FAILED', message, { details: [{ path: 'document_media_id', message }] });
    }
  }

  return {
    state: data.state,
    license_number: data.license_number.replace(/\s+/g, ' ').toUpperCase(),
    expires_on: data.expires_on,
    matches_registry: licenseMatchesRegistry(data, registry),
    document,
  };
}

/**
 * One NPI, one person.
 *
 * Refuses an NPI already attached to someone else: a provider record they own,
 * or an application of theirs that has been submitted or approved.
 *
 * It deliberately does not refuse against another application still in
 * progress. If it did, an impersonator who got there first could lock the real
 * doctor out of their own number. That case goes to the reviewer instead.
 *
 * Nor does it refuse a provider record with no owner. That is a profile an
 * office created before the clinician had an account, and entering its NPI is
 * exactly how the clinician is meant to claim it.
 */
async function assertNpiNotClaimed(tx: Tx, userId: string, npi: string): Promise<void> {
  const claimed = await withElevated(tx, async () => {
    const [owned] = await tx
      .select({ id: providers.id })
      .from(providers)
      .where(and(eq(providers.npi, npi), isNull(providers.deletedAt), ne(providers.userId, userId)))
      .limit(1);
    if (owned) return true;

    const [submitted] = await tx
      .select({ id: onboardingSessions.id })
      .from(onboardingSessions)
      .where(
        and(
          ne(onboardingSessions.userId, userId),
          inArray(onboardingSessions.status, ['submitted', 'needs_changes', 'approved']),
          sql`${onboardingSessions.draft} -> 'npi_lookup' ->> 'npi' = ${npi}`,
        ),
      )
      .limit(1);
    return Boolean(submitted);
  });

  if (claimed) {
    throw npiError(
      'This NPI is already registered to another CareOndeck account. If it is yours, contact support and we will sort it out.',
      'CONFLICT',
    );
  }
}

async function reviewSignals(tx: Tx, userId: string, npi: string): Promise<ReviewSignals> {
  return withElevated(tx, async () => {
    const [elsewhere] = await tx
      .select({ id: onboardingSessions.id })
      .from(onboardingSessions)
      .where(
        and(
          ne(onboardingSessions.userId, userId),
          eq(onboardingSessions.status, 'in_progress'),
          sql`${onboardingSessions.draft} -> 'npi_lookup' ->> 'npi' = ${npi}`,
        ),
      )
      .limit(1);

    const [unclaimed] = await tx
      .select({ id: providers.id })
      .from(providers)
      .where(and(eq(providers.npi, npi), isNull(providers.userId), isNull(providers.deletedAt)))
      .limit(1);

    return { npi_in_use_elsewhere: Boolean(elsewhere), matches_unclaimed_profile: Boolean(unclaimed) };
  });
}

/** Refuses what the registry says an applicant cannot use. */
function assertUsable(record: NpiRecord | null): NpiRecord {
  if (!record) {
    throw npiError("We couldn't find that NPI in the national registry. Check the number and try again.");
  }
  if (record.enumerationType === 'NPI-2') {
    throw npiError('That NPI belongs to an organization. Enter the individual NPI issued to you personally.');
  }
  if (record.status !== 'A') {
    throw npiError('That NPI is not active in the national registry.');
  }
  return record;
}

function npiError(message: string, code: 'VALIDATION_FAILED' | 'CONFLICT' = 'VALIDATION_FAILED'): ApiError {
  return new ApiError(code, message, { details: [{ path: 'npi', message }] });
}

function toProfile(record: NpiRecord): NpiProfile {
  const primary = record.taxonomies.find((taxonomy) => taxonomy.primary) ?? record.taxonomies[0] ?? null;
  const location =
    record.addresses.find((address) => address.purpose === 'LOCATION') ?? record.addresses[0] ?? null;

  return {
    npi: record.npi,
    first_name: record.firstName,
    middle_name: record.middleName,
    last_name: record.lastName,
    credential: record.credential,
    former_names: record.otherNames.map((other) => ({ first_name: other.firstName, last_name: other.lastName })),
    enumeration_date: record.enumerationDate,
    primary_taxonomy: primary
      ? { code: primary.code, desc: primary.desc, state: primary.state, license: primary.license }
      : null,
    practice_location: location
      ? {
          line1: location.line1,
          line2: location.line2,
          city: location.city,
          state: location.state,
          postal_code: location.postalCode,
          phone: location.phone,
        }
      : null,
  };
}

function requireSession(ctx: RequestContext) {
  if (!ctx.session) throw ApiError.unauthenticated();
  return ctx.session;
}

/**
 * Scoped to the caller in the query as well as by RLS. The policy is what
 * cannot be bypassed; the filter is what turns a wrong id into a clean 404.
 */
async function findOwn(tx: Tx, userId: string, id: string): Promise<SessionRow | null> {
  if (!UUID.test(id)) return null;

  const [row] = await tx
    .select()
    .from(onboardingSessions)
    .where(and(eq(onboardingSessions.id, id), eq(onboardingSessions.userId, userId)))
    .limit(1);

  return row ?? null;
}

function toView(row: SessionRow): OnboardingSessionView {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    current_step: row.currentStep,
    completed_steps: row.completedSteps,
    draft: withoutReviewSignals(row.draft),
    reviewer_note: row.reviewerNote,
    submitted_at: row.submittedAt ? row.submittedAt.toISOString() : null,
    last_active_at: row.lastActiveAt.toISOString(),
  };
}

function withoutReviewSignals(draft: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(draft).map(([step, answer]) => {
      if (answer !== null && typeof answer === 'object' && !Array.isArray(answer) && 'review' in answer) {
        const { review: _review, ...visible } = answer as Record<string, unknown>;
        return [step, visible];
      }
      return [step, answer];
    }),
  );
}

/**
 * Compares two stored answers regardless of key order. Postgres `jsonb` does not
 * keep the order keys were written in, so a plain JSON.stringify would call an
 * unchanged multi-field answer "changed" and discard later steps for nothing.
 */
function sameAnswer(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}
