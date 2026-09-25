import { z } from 'zod';

/** The provider to save, by id. Whether they are listed is checked by the service. */
export const saveProviderSchema = z
  .object({
    provider_id: z.string().uuid('Choose a provider.'),
  })
  .strict();

export type SaveProviderInput = z.infer<typeof saveProviderSchema>;
