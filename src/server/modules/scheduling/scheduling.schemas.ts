import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-09-17.');

/**
 * Which days the booking picker is asking about.
 *
 * Dates, not instants: the picker draws a calendar in the clinic's zone, and a
 * date is the only thing both sides can agree on without sending an offset.
 * The span is capped so one request cannot ask the server to walk a year.
 */
export const bookableSlotsQuerySchema = z
  .object({
    provider_id: z.string().uuid('Choose a provider.'),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'The end date comes before the start date.',
    path: ['to'],
  })
  .refine((value) => !value.from || !value.to || daysBetween(value.from, value.to) <= 62, {
    message: 'Ask for two months at a time or less.',
    path: ['to'],
  });

export type BookableSlotsQuery = z.infer<typeof bookableSlotsQuerySchema>;

function daysBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / 86_400_000;
}

/**
 * The practice calendar's window: the day or the week on screen, as dates in
 * the clinic's zone. Capped at a month so one request stays one screen.
 */
export const calendarQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((value) => value.from <= value.to, { message: 'The end date comes before the start date.', path: ['to'] })
  .refine((value) => daysBetween(value.from, value.to) <= 31, { message: 'Ask for a month or less.', path: ['to'] });

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;

/**
 * Booking Holds. The three presets are worked out by the server in the clinic's
 * zone, so "today" is the clinic's today whatever the browser's clock says. A
 * custom hold names its first and last day, both included.
 */
export const createHoldSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('today') }).strict(),
  z.object({ scope: z.literal('this_week') }).strict(),
  z.object({ scope: z.literal('this_month') }).strict(),
  z
    .object({
      scope: z.literal('custom'),
      from: isoDate,
      to: isoDate,
      reason: z.string().trim().max(200, 'Keep the reason under 200 characters.').nullish(),
    })
    .strict(),
]);

export type CreateHoldInput = z.infer<typeof createHoldSchema>;
