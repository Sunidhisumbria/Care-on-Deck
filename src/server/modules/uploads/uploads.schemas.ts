import { z } from 'zod';

import { uploadPurposeSchema } from '@/lib/uploads';

/** Asks for permission to upload. Type and size are checked now only to fail fast. */
export const createUploadSchema = z
  .object({
    purpose: uploadPurposeSchema,
    content_type: z.string().trim().min(1, 'Choose a file.').max(100),
    byte_size: z.number().int().positive('That file is empty.'),
  })
  .strict();
export type CreateUploadInput = z.infer<typeof createUploadSchema>;

/** Reports an upload finished. The key must be one this server issued to the caller. */
export const completeUploadSchema = z
  .object({
    purpose: uploadPurposeSchema,
    key: z.string().trim().min(1).max(300),
  })
  .strict();
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
