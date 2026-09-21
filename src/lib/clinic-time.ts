/**
 * Appointment times, shown in the clinic's timezone rather than the reader's.
 *
 * An appointment is a time to walk through a door in Tigard, Oregon. A patient
 * reading it on a laptop still set to India must see 10:00 AM, not 10:30 PM --
 * and the date can change too, when the two zones straddle midnight. So every
 * function here takes the facility's IANA zone, and nothing reads the
 * browser's.
 */

/** "10:00 AM" at the clinic. */
export function formatClinicTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  );
}

/**
 * The date at the clinic: "Wednesday, September 16, 2026" (`long`), or
 * "Sep 16, 2026" (`medium`, as the appointment details design writes it).
 */
export function formatClinicDate(
  iso: string,
  timeZone: string,
  style: 'long' | 'medium' = 'long',
): string {
  return new Intl.DateTimeFormat(
    'en-US',
    style === 'long'
      ? { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
      : { timeZone, month: 'short', day: '2-digit', year: 'numeric' },
  ).format(new Date(iso));
}

/** The pieces of a date badge: SEP / 16 / WED, or SEP / 16 / WEDNESDAY with `long`. */
export function clinicDateParts(iso: string, timeZone: string, weekday: 'short' | 'long' = 'short') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    weekday,
  }).formatToParts(new Date(iso));

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? '';

  return { month: part('month'), day: part('day'), weekday: part('weekday') };
}

/** "PDT", "EST" -- said beside a time so nobody has to guess whose clock it is. */
export function clinicZoneName(iso: string, timeZone: string): string {
  return (
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
      .formatToParts(new Date(iso))
      .find((entry) => entry.type === 'timeZoneName')?.value ?? timeZone
  );
}
