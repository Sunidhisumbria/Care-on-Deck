import { z } from 'zod';

import { isValidDateOfBirth, profileAddressSchema } from '@/lib/patient-profile';

/** Whose list of visit reasons to show. */
export const visitReasonsQuerySchema = z.object({
  provider_id: z.string().uuid('Choose a provider first.'),
});

export type VisitReasonsQuery = z.infer<typeof visitReasonsQuerySchema>;

/**
 * A booking request from the marketplace flow.
 *
 * The slot is identified by its start instant, and the server re-derives that
 * the slot is genuinely open before it writes -- a time that was free when the
 * page loaded may be gone by the time Save is pressed, and the browser is not
 * the authority on which.
 *
 * `patient_insurance_id` names a card the patient has already saved. Card
 * details themselves never come through here: this endpoint would otherwise be
 * a second, unaudited way to send a member ID.
 */
export const bookingRequestSchema = z
  .object({
    provider_id: z.string().uuid('Choose a provider.'),
    starts_at: z.string().datetime({ message: 'Choose an appointment time.' }),
    visit_reason_id: z.string().uuid().nullish(),
    /** What the patient wants the practice to know. Not a medical record. */
    patient_note: z.string().trim().max(500, 'Keep this under 500 characters.').nullish(),
    /**
     * From the Your Details step. Saved to the patient's own record, which is
     * how an account that skipped Create Profile gets them.
     */
    patient: z
      .object({
        date_of_birth: z.string().refine(isValidDateOfBirth, 'Enter a valid date of birth that is not in the future.'),
        gender: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Select your sex assigned at birth.' }) }),
      })
      .strict()
      .nullish(),
    /** From the Your Address step. Saved as the patient's default address, so it is asked once. */
    address: profileAddressSchema.nullish(),
    payment: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('self_pay') }),
      z.object({ kind: z.literal('insurance'), patient_insurance_id: z.string().uuid() }),
    ]),
  })
  .strict();

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
