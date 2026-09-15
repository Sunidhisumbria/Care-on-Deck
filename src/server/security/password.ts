import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

/**
 * Hand-rolled rather than `promisify(scrypt)`: promisify collapses to the
 * three-argument overload and loses the options parameter, so the cost
 * settings below would be silently dropped.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/**
 * Password hashing.
 *
 * scrypt from node:crypto rather than argon2 or bcrypt: it is memory-hard,
 * OWASP-approved, and needs no native build -- which matters on a Windows dev
 * machine where node-gyp failures cost more time than the algorithm choice
 * saves. The stored format carries its own parameters, so cost can be raised
 * later and old hashes still verify.
 *
 *   scrypt$N$r$p$salt$hash    (salt and hash base64url)
 *
 * N = 2^16 with r=8, p=1 costs roughly 64 MB and ~100 ms per attempt, which is
 * OWASP's floor for scrypt. Raise N when the hardware allows; `needsRehash`
 * tells the login path when a stored hash is behind the current setting.
 */
const CURRENT = { N: 2 ** 16, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/**
 * scrypt needs maxmem above roughly 128 * N * r bytes, and Node's default is
 * 32 MB -- below what these parameters require.
 */
function maxmem(N: number, r: number): number {
  return 256 * N * r;
}

export async function hashPassword(plaintext: string): Promise<string> {
  const { N, r, p } = CURRENT;
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(plaintext.normalize('NFKC'), salt, KEY_LENGTH, {
    N,
    r,
    p,
    maxmem: maxmem(N, r),
  });

  return [
    'scrypt',
    N,
    r,
    p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

/**
 * Constant-time verification. Returns false rather than throwing on a
 * malformed stored value -- a corrupt row should fail the login, not the
 * request.
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(rawSalt!, 'base64url');
    expected = Buffer.from(rawHash!, 'base64url');
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  try {
    const derived = await scrypt(plaintext.normalize('NFKC'), salt, expected.length, {
      N,
      r,
      p,
      maxmem: maxmem(N, r),
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** True when a stored hash used weaker parameters than we now require. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return true;
  return Number(parts[1]) < CURRENT.N || Number(parts[2]) < CURRENT.r;
}

/**
 * A hash of a value nobody will ever submit.
 *
 * Login uses it to spend the same work when the email is unknown as when it is
 * known. Without that, an unknown address returns in about a millisecond and a
 * known one in a hundred -- which is a reliable way to enumerate who has an
 * account.
 */
let decoy: Promise<string> | null = null;
export function decoyHash(): Promise<string> {
  decoy ??= hashPassword(randomBytes(32).toString('base64url'));
  return decoy;
}
