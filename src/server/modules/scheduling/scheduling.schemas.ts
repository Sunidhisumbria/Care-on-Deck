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
