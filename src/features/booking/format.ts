/**
 * Times are shown in the clinic's timezone, not the reader's.
 *
 * A patient in Delhi looking at a clinic in Oregon must see the hour they will
 * walk in at, and the appointment card has to agree with the clinic's own
 * calendar. Everything here takes the facility timezone for that reason.
 */

/** "Today · 9:00 AM", "Tomorrow · 2:30 PM", or "Thu, Sep 18 · 9:00 AM". */
export function formatNextAvailable(iso: string | null, timeZone: string): string {
  if (!iso) return 'No openings this month';

  const when = new Date(iso);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(when);

  const now = new Date();
  const day = dayIn(when, timeZone);
  let label: string;

  if (day === dayIn(now, timeZone)) label = 'Today';
  else if (day === dayIn(new Date(now.getTime() + 86_400_000), timeZone)) label = 'Tomorrow';
  else
    label = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(when);

  return `${label} · ${time}`;
}

/** The calendar date at that instant in that zone, as YYYY-MM-DD. */
function dayIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** "9:00 AM" and "Thursday, September 17, 2026" at the clinic. Shared with the appointment screens. */
export {
  formatClinicDate as formatSlotDate,
  formatClinicTime as formatSlotTime,
} from '@/lib/clinic-time';
