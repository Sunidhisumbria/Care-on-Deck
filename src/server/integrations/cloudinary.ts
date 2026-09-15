import { createHash } from 'node:crypto';

import { env } from '@/server/config/env';
import { ApiError, IntegrationNotConfiguredError } from '@/server/http/errors';

import type { DirectUpload, FileStorageAdapter, StoredFile } from './types';

/**
 * Interim file storage, until the client's AWS account and S3 bucket exist.
 *
 * Provider documents only -- license documents, certificates, headshots. Never
 * patient data: Cloudinary signs a HIPAA Business Associate Agreement only on
 * enterprise plans, so insurance cards wait for S3 whatever happens here.
 *
 * Every file is uploaded as `authenticated`. That type has no public URL at
 * all; the only way to read one is a link signed by this server, and the links
 * it issues expire.
 *
 * No SDK. Everything used here is a signed form post or a signed query string,
 * a few lines with node:crypto -- and adding the SDK would mean installing into
 * a pnpm-managed node_modules, which npm can break.
 */

const API = 'https://api.cloudinary.com/v1_1';
const TIMEOUT_MS = 10_000;

/** Cloudinary refuses a signed upload whose timestamp is more than an hour old. */
const UPLOAD_WINDOW_SECONDS = 60 * 60;

export const cloudinary: FileStorageAdapter = {
  vendor: 'cloudinary',
  meter: null,

  isConfigured() {
    return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  },

  /**
   * Permission for the browser to upload one file to one exact place.
   *
   * The key and the allowed formats are inside the signature, so the browser
   * cannot choose a different location or sneak in another kind of file.
   * `overwrite=false` means a signed key can never be used to replace a file
   * already stored under it.
   */
  createUpload({ key, formats }) {
    const credentials = requireCredentials();
    const timestamp = nowSeconds();
    const params = {
      allowed_formats: formats.join(','),
      overwrite: 'false',
      public_id: key,
      timestamp,
      type: 'authenticated',
    };

    return {
      url: `${API}/${credentials.cloud}/image/upload`,
      fields: { ...asStrings(params), api_key: credentials.apiKey, signature: sign(params, credentials.secret) },
      expiresAt: new Date((timestamp + UPLOAD_WINDOW_SECONDS) * 1000).toISOString(),
    } satisfies DirectUpload;
  },

  /** What actually arrived, according to Cloudinary. Null when nothing is stored under the key. */
  async inspect(key) {
    const credentials = requireCredentials();
    const response = await call(`${API}/${credentials.cloud}/resources/image/authenticated/${encodeKey(key)}`, {
      headers: { authorization: basicAuth(credentials.apiKey, credentials.secret) },
    });

    if (response.status === 404) return null;
    if (!response.ok) throw storageUnavailable();

    const body = (await response.json()) as {
      public_id: string;
      bytes: number;
      format: string;
      width?: number;
      height?: number;
    };

    return {
      key: body.public_id,
      bytes: body.bytes,
      format: body.format,
      width: body.width ?? null,
      height: body.height ?? null,
    } satisfies StoredFile;
  },

  /**
   * A link that serves the original file and stops working after
   * `expiresInSeconds`. Anyone holding it can open it until then, which is why
   * the server hands it out only to someone allowed to see the file, and why
   * the lifetime is minutes rather than days.
   */
  viewUrl({ key, format, expiresInSeconds }) {
    const credentials = requireCredentials();
    const timestamp = nowSeconds();
    const params = {
      expires_at: timestamp + expiresInSeconds,
      format,
      public_id: key,
      timestamp,
      type: 'authenticated',
    };
    const query = new URLSearchParams({
      ...asStrings(params),
      api_key: credentials.apiKey,
      signature: sign(params, credentials.secret),
    });
    return `${API}/${credentials.cloud}/image/download?${query.toString()}`;
  },

  async remove(key) {
    const credentials = requireCredentials();
    const params = { invalidate: 'true', public_id: key, timestamp: nowSeconds(), type: 'authenticated' };
    const response = await call(`${API}/${credentials.cloud}/image/destroy`, {
      method: 'POST',
      body: new URLSearchParams({
        ...asStrings(params),
        api_key: credentials.apiKey,
        signature: sign(params, credentials.secret),
      }),
    });
    if (!response.ok) throw storageUnavailable();
  },
};

/**
 * Cloudinary's request signature: the parameters sorted by name and joined as
 * a query string, the API secret appended, SHA-1 in hex. `api_key`, `file` and
 * the resource type are never part of it.
 */
export function sign(params: Record<string, string | number>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join('&');
  return createHash('sha1').update(toSign + secret).digest('hex');
}

function requireCredentials() {
  const cloud = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const secret = env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret) throw new IntegrationNotConfiguredError('Cloudinary');
  return { cloud, apiKey, secret };
}

async function call(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  } catch {
    throw storageUnavailable();
  }
}

function storageUnavailable(): ApiError {
  return new ApiError('INTEGRATION_UNAVAILABLE', 'The file service is not responding. Please try again in a few minutes.');
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function asStrings(params: Record<string, string | number>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([name, value]) => [name, String(value)]));
}

/** Keys contain slashes, which are part of the path; each segment is encoded, not the separators. */
function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

function basicAuth(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
}
