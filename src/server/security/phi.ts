import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { env } from '@/server/config/env';

/**
 * Column-level encryption for the few fields that must not be readable from a
 * database dump: insurance member and group numbers, integration credentials,
 * TOTP secrets.
 *
 * Scope is deliberately narrow. Encrypting names and dates of birth would make
 * search and reporting impossible; those are protected by RLS, disk encryption
 * and the PHI access log instead. Encrypt what is both sensitive AND never
 * queried -- that is the honest line.
 *
 * AES-256-GCM. Output is `v1.<iv>.<tag>.<ciphertext>`, all base64url, so the
 * format can be versioned when the key is rotated.
 */

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  if (!env.PHI_ENCRYPTION_KEY) {
    throw new Error('PHI_ENCRYPTION_KEY is not set; refusing to handle sensitive fields.');
  }
  const decoded = Buffer.from(env.PHI_ENCRYPTION_KEY, 'base64');
  if (decoded.length !== 32) {
    throw new Error('PHI_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  }
  cachedKey = decoded;
  return decoded;
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptField(encoded: string): string {
  const [version, iv, tag, ciphertext] = encoded.split('.');
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error('Encrypted field is malformed or was written by an unknown key version.');
  }
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptOptional(value: string | null | undefined): string | null {
  return value ? encryptField(value) : null;
}

export function decryptOptional(value: string | null | undefined): string | null {
  return value ? decryptField(value) : null;
}

/** Last four characters, kept in the clear so staff can confirm a card. */
export function last4(value: string): string {
  return value.replace(/\s+/g, '').slice(-4);
}
