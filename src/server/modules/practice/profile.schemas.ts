import { z } from 'zod';

/** Personal details > photo. Null removes it. */
export const updateProviderPhotoSchema = z
  .object({
    headshot_media_id: z.string().uuid('That photo was not recognised. Upload it again.').nullable(),
  })
  .strict();

export type UpdateProviderPhotoInput = z.infer<typeof updateProviderPhotoSchema>;
