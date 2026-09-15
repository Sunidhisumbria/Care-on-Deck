import { z } from 'zod';

/**
 * A provider's weekly hours, as the Schedule step and the server both check
 * them -- and the one piece of arithmetic that turns them into bookable time.
 *
 * Times are wall-clock at the practice ("09:00" means nine in the morning where
 * the practice is), which is why the practice records its time zone.
 */

export const APPOINTMENT_LENGTHS = [15, 30, 60, 90, 120] as const;

/**
 * The days as the design lists them, Monday first. `weekday` is how they are
 * stored: Sunday is 0, as in `availability_rules` and in JavaScript's getDay().
 */
export const WEEKDAYS = [
  { weekday: 1, label: 'Monday', short: 'Mon' },
  { weekday: 2, label: 'Tuesday', short: 'Tue' },
  { weekday: 3, label: 'Wednesday', short: 'Wed' },
  { weekday: 4, label: 'Thursday', short: 'Thu' },
  { weekday: 5, label: 'Friday', short: 'Fri' },
  { weekday: 6, label: 'Saturday', short: 'Sat' },
  { weekday: 0, label: 'Sunday', short: 'Sun' },
] as const;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const daySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  })
  .strict();

const breakSchema = z
  .object({
    start: z.string().regex(TIME, 'Enter a time.'),
    end: z.string().regex(TIME, 'Enter a time.'),
  })
  .strict();

export const scheduleSchema = z
  .object({
    appointment_minutes: z.coerce
      .number()
      .refine((value) => (APPOINTMENT_LENGTHS as readonly number[]).includes(value), 'Choose an appointment length.'),
    days: z.array(daySchema).length(7, 'Every day of the week must be included.'),
    breaks: z.array(breakSchema).max(3, 'Add up to three breaks.'),
  })
  .strict()
  .superRefine((value, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    if (new Set(value.days.map((day) => day.weekday)).size !== value.days.length) {
      issue(['days'], 'Every day of the week must be included once.');
    }
    if (!value.days.some((day) => day.enabled)) {
      issue(['days'], 'Turn on at least one day you see patients.');
    }

    const breaksValid = value.breaks.every((pause) => TIME.test(pause.start) && TIME.test(pause.end));
    value.breaks.forEach((pause, index) => {
      if (TIME.test(pause.start) && TIME.test(pause.end) && toMinutes(pause.end) <= toMinutes(pause.start)) {
        issue(['breaks', index, 'end'], 'A break must end after it starts.');
      }
      const overlaps = value.breaks.some(
        (other, otherIndex) =>
          otherIndex < index &&
          toMinutes(pause.start) < toMinutes(other.end) &&
          toMinutes(other.start) < toMinutes(pause.end),
      );
      if (overlaps) issue(['breaks', index, 'start'], 'Breaks cannot overlap.');
    });

    value.days.forEach((day, index) => {
      if (!day.enabled) return;
      const label = WEEKDAYS.find((entry) => entry.weekday === day.weekday)?.label ?? 'That day';

      if (!TIME.test(day.start)) return issue(['days', index, 'start'], 'Enter a start time.');
      if (!TIME.test(day.end)) return issue(['days', index, 'end'], 'Enter an end time.');

      const length = toMinutes(day.end) - toMinutes(day.start);
      if (length <= 0) return issue(['days', index, 'end'], 'End after the start time.');
      if (length < value.appointment_minutes) {
        return issue(['days', index, 'end'], 'That is shorter than one appointment.');
      }
      if (breaksValid && workingWindows(day, value.breaks, value.appointment_minutes).length === 0) {
        issue(['days', index, 'end'], `Your breaks leave no time for appointments on ${label}.`);
      }
    });
  });

export type ScheduleValues = z.infer<typeof scheduleSchema>;

/** Nine to five, Monday to Friday, half-hour appointments -- a starting point to adjust, shown in full. */
export function defaultSchedule(): ScheduleValues {
  return {
    appointment_minutes: 30,
    days: WEEKDAYS.map(({ weekday }) => ({
      weekday,
      enabled: weekday >= 1 && weekday <= 5,
      start: '09:00',
      end: '17:00',
    })),
    breaks: [],
  };
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** "13:30" -> "1:30 PM". */
export function formatTime(time: string): string {
  const total = toMinutes(time);
  const hours = Math.floor(total / 60);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 === 0 ? 12 : hours % 12}:${String(total % 60).padStart(2, '0')} ${suffix}`;
}

export function formatAppointmentLength(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes === 60) return '1 hour';
  return `${minutes / 60} hours`;
}

/**
 * A day's hours with the breaks cut out: the windows that become availability
 * rules. A window too short for even one appointment is dropped rather than
 * stored, because it could never be booked.
 */
export function workingWindows(
  day: { start: string; end: string },
  breaks: ReadonlyArray<{ start: string; end: string }>,
  minimumMinutes: number,
): Array<{ start: string; end: string }> {
  let windows = [{ start: toMinutes(day.start), end: toMinutes(day.end) }];

  for (const pause of breaks) {
    const breakStart = toMinutes(pause.start);
    const breakEnd = toMinutes(pause.end);
    windows = windows.flatMap((window) => {
      if (breakEnd <= window.start || breakStart >= window.end) return [window];
      const pieces: Array<{ start: number; end: number }> = [];
      if (breakStart > window.start) pieces.push({ start: window.start, end: breakStart });
      if (breakEnd < window.end) pieces.push({ start: breakEnd, end: window.end });
      return pieces;
    });
  }

  return windows
    .filter((window) => window.end - window.start >= minimumMinutes)
    .map((window) => ({ start: toTime(window.start), end: toTime(window.end) }));
}
