import { z } from 'zod';

import { CARRIER_NOT_LISTED } from '@/lib/patient-insurance';
import { isValidDateOfBirth, LANGUAGES, type ProfileUpdateInput } from '@/lib/patient-profile';
import { isValidUsPhone, PHONE_RULE } from '@/lib/phone';

/**
 * What the Edit Profile form holds: every input as a string, the way the DOM
 * gives it. `toProfileUpdate` turns it into the request `lib/patient-profile`
 * defines, where the server checks it all again.
 */
export const editProfileFormSchema = z
  .object({
    has_card: z.boolean(),
    preferred_name: z.string().trim().max(100, 'Keep your preferred name under 100 characters.'),
    date_of_birth: z
      .string()
      .min(1, 'Enter your date of birth.')
      .refine(isValidDateOfBirth, 'Enter a valid date of birth that is not in the future.'),
    language: z.string().refine((value) => (LANGUAGES as readonly string[]).includes(value), 'Select a language.'),
    gender: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Select your sex assigned at birth.' }) }),
    /** Optional: '' is "not given". */
    gender_identity: z.string(),

    line1: z.string().trim().max(200, 'Keep the street under 200 characters.'),
    line2: z.string().trim().max(200, 'Keep the apartment under 200 characters.'),
    city: z.string().trim().max(120, 'Keep the city under 120 characters.'),
    state: z.string(),
    postal_code: z.string().trim(),

    phone_type: z.string(),
    /** '' when there is no secondary phone. */
    secondary_phone: z.string().trim(),
    secondary_phone_type: z.string(),

    carrier_id: z.string(),
    carrier_name: z.string().trim().max(200, 'Keep the carrier name under 200 characters.'),
    member_id: z.string().trim().max(64, 'That member ID is too long.'),
    group_id: z.string().trim().max(64, 'That group ID is too long.'),
    relationship: z.string(),
  })
  .superRefine((value, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    // An address starts to count once there is a street or a ZIP -- city and
    // state alone are prefilled from signup and are not somewhere to send
    // anything. From then on it is all or nothing.
    if (value.line1 || value.postal_code) {
      if (!value.line1) issue('line1', 'Enter your street address.');
      if (!value.city) issue('city', 'Enter your city.');
      if (!value.state) issue('state', 'Select your state.');
      if (!value.postal_code) issue('postal_code', 'Enter a postal code.');
      else if (value.postal_code.length > 12) issue('postal_code', 'Keep the postal code to 12 characters.');
    }

    if (value.secondary_phone && !isValidUsPhone(value.secondary_phone)) issue('secondary_phone', PHONE_RULE);

    if (value.has_card) {
      if (!value.relationship) issue('relationship', 'Select your relationship to the policyholder.');
      if (!value.carrier_id) issue('carrier_id', 'Select your insurance carrier.');
      if (value.carrier_id === CARRIER_NOT_LISTED && !value.carrier_name) {
        issue('carrier_name', 'Enter the carrier name as printed on your card.');
      }
      if (!value.member_id) issue('member_id', 'Enter your member ID.');
    }
  });

export type EditProfileFormValues = z.infer<typeof editProfileFormSchema>;

/** Form values to the PATCH body. Blank optional fields go as null, never as empty strings. */
export function toProfileUpdate(
  values: EditProfileFormValues,
  extra: { photoMediaId: string | null; insuranceId: string | null; cardMediaId: string | null },
): ProfileUpdateInput {
  const notListed = values.carrier_id === CARRIER_NOT_LISTED;
  const hasAddress = Boolean(values.line1 || values.postal_code);

  return {
    preferred_name: values.preferred_name || null,
    date_of_birth: values.date_of_birth,
    gender: values.gender,
    gender_identity: (values.gender_identity || null) as ProfileUpdateInput['gender_identity'],
    language: values.language as ProfileUpdateInput['language'],
    phone_type: (values.phone_type || null) as ProfileUpdateInput['phone_type'],
    secondary_phone: values.secondary_phone || null,
    secondary_phone_type: values.secondary_phone ? ((values.secondary_phone_type || 'mobile') as ProfileUpdateInput['secondary_phone_type']) : null,
    photo_media_id: extra.photoMediaId,
    address: hasAddress
      ? {
          line1: values.line1,
          line2: values.line2 || null,
          city: values.city,
          state: values.state as NonNullable<ProfileUpdateInput['address']>['state'],
          postal_code: values.postal_code,
        }
      : null,
    ...(extra.insuranceId
      ? {
          insurance: {
            id: extra.insuranceId,
            carrier_id: notListed ? null : values.carrier_id,
            ...(notListed ? { carrier_name: values.carrier_name } : {}),
            member_id: values.member_id,
            ...(values.group_id ? { group_id: values.group_id } : {}),
            relationship: values.relationship as NonNullable<ProfileUpdateInput['insurance']>['relationship'],
            card_media_id: extra.cardMediaId,
          },
        }
      : {}),
  };
}
