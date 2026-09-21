import { z } from 'zod';

/**
 * What the Select a Provider screen may ask for.
 *
 * Query strings arrive as text, so booleans and numbers are coerced here and
 * nowhere else. Unknown parameters are ignored rather than rejected: a link
 * shared with a tracking parameter on the end should still show results.
 */
export const providerSearchQuerySchema = z.object({
  /** Matches a provider, clinic, city or specialty. */
  q: z.string().trim().max(120).optional(),
  insurance_carrier_id: z.string().uuid('Choose an insurer from the list.').optional(),
  /** Narrows to providers with an open slot in that window. */
  availability: z.enum(['today', 'tomorrow', 'week']).optional(),
  accepting_new_patients: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  sort: z.enum(['recommended', 'soonest']).default('recommended'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ProviderSearchQuery = z.infer<typeof providerSearchQuerySchema>;
