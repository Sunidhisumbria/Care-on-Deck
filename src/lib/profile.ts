import { z } from 'zod';

/**
 * A provider's public profile details from the Upload Profile step, as the
 * screen and the server both check them.
 *
 * The photo and certificates are optional for now. Uploads depend on file
 * storage being configured, and which certificates are required -- if any --
 * has not been decided; making either mandatory today would block every
 * application on something the applicant cannot fix.
 */
export const profileSchema = z
  .object({
    headshot_media_id: z.string().uuid('That photo was not recognised. Upload it again.').nullable().optional(),
    bio: z
      .string()
      .trim()
      .min(20, 'Tell patients a little about yourself -- at least 20 characters.')
      .max(1000, 'Keep your bio under 1,000 characters.'),
    /*
     * Not z.coerce: that turns an empty field into 0, and a provider who skipped
     * it would be listed with "0 years of experience" rather than asked.
     */
    years_experience: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
      z
        .number({ required_error: 'Enter your years of experience.', invalid_type_error: 'Enter a number.' })
        .int('Use a whole number of years.')
        .min(0, 'Years of experience cannot be negative.')
        .max(70, 'Check that number -- it is more than a full career.'),
    ),
    certificate_media_ids: z
      .array(z.string().uuid('That certificate was not recognised. Upload it again.'))
      .max(2, 'Add up to two certificates.'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.certificate_media_ids).size !== value.certificate_media_ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['certificate_media_ids'],
        message: 'The same certificate was added twice.',
      });
    }
  });

export type ProfileValues = z.infer<typeof profileSchema>;
