/**
 * Phone numbers, as the app takes them: US, with +1 fixed in front.
 *
 * The person types only what comes after +1, and 8 to 14 digits of it. The top
 * of that range is not a guess: numbers are stored in the international format
 * (E.164), which allows 15 digits including the country code, and SMS providers
 * refuse anything longer -- so 14 after the "1" is the most that can still
 * receive a verification text.
 *
 * Shared by the forms and the server, so the two cannot disagree about what a
 * valid number is.
 */
export const PHONE_LOCAL_MIN = 8;
export const PHONE_LOCAL_MAX = 14;

export const PHONE_RULE = `Enter ${PHONE_LOCAL_MIN} to ${PHONE_LOCAL_MAX} digits after +1.`;

/**
 * The digits after +1, from whatever form the number arrived in:
 * "+15035550142", "(503) 555-0142", or "1 503 555 0142".
 */
export function localPhoneDigits(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+1')) return digits.slice(1);
  if (trimmed.startsWith('+')) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

/** A +1 number with 8 to 14 digits after the country code. Other country codes are refused. */
export function isValidUsPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith('+') && !trimmed.startsWith('+1')) return false;

  const length = localPhoneDigits(trimmed).length;
  return length >= PHONE_LOCAL_MIN && length <= PHONE_LOCAL_MAX;
}
