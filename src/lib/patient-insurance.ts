import { z } from 'zod';

/**
 * A patient's health or dental insurance, as the insurance screens and the
 * server both check it.
 *
 * Health and dental only, per the client's OCR handoff. There are deliberately
 * no fields for pharmacy or vision benefits: RxBIN, PCN, RxGRP and the rest
 * are printed on many cards, and the schema is strict so they are refused
 * rather than stored.
 */

export const INSURANCE_TYPES = [
  {
    value: 'health',
    label: 'Health insurance',
    title: 'Health Insurance',
    caption: 'Medical, specialist, preventive care',
  },
  {
    value: 'dental',
    label: 'Dental insurance',
    title: 'Dental Insurance',
    caption: 'Dental and orthodontic coverage',
  },
] as const;

export type InsuranceType = (typeof INSURANCE_TYPES)[number]['value'];

export const RELATIONSHIPS = [
  { value: 'self', label: 'Self' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent_guardian', label: 'Parent or guardian' },
  { value: 'other', label: 'Other' },
] as const;

export type Relationship = (typeof RELATIONSHIPS)[number]['value'];

/** The carrier select's value for "not in the directory". Never sent to the server. */
export const CARRIER_NOT_LISTED = 'not_listed';

const TYPE_VALUES = INSURANCE_TYPES.map((type) => type.value) as [InsuranceType, ...InsuranceType[]];
const RELATIONSHIP_VALUES = RELATIONSHIPS.map((entry) => entry.value) as [Relationship, ...Relationship[]];

/** Letters, digits, spaces and dashes: what member and group IDs are printed with. */
const CARD_NUMBER = /^[A-Za-z0-9][A-Za-z0-9 -]*$/;
const CARD_NUMBER_MESSAGE = 'Use only the letters, numbers and dashes shown on your card.';

const fields = {
  insurance_type: z.enum(TYPE_VALUES, { errorMap: () => ({ message: 'Select the insurance type.' }) }),
  carrier_name: z.string().trim().max(200, 'Keep the carrier name under 200 characters.').optional(),
  member_id: z
    .string()
    .trim()
    .min(1, 'Enter your member ID.')
    .max(64, 'That member ID is too long.')
    .regex(CARD_NUMBER, CARD_NUMBER_MESSAGE),
  // No error when the card has no group number: the handoff is explicit.
  group_id: z
    .string()
    .trim()
    .max(64, 'That group ID is too long.')
    .optional()
    .refine((value) => !value || CARD_NUMBER.test(value), CARD_NUMBER_MESSAGE),
  policyholder_name: z.string().trim().max(200, 'Keep the name under 200 characters.').optional(),
  relationship: z.enum(RELATIONSHIP_VALUES, {
    errorMap: () => ({ message: 'Select your relationship to the policyholder.' }),
  }),
};

/** The card's own fields, for the Edit Profile screen, which edits a card on file without re-asking its type. */
export const insuranceCardFields = {
  carrier_name: fields.carrier_name,
  member_id: fields.member_id,
  group_id: fields.group_id,
};

/** What the API accepts: a carrier from the directory or, when it is not listed, its name. */
export const patientInsuranceSchema = z
  .object({ ...fields, carrier_id: z.string().uuid('Select your insurance carrier.').nullable() })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.carrier_id && !value.carrier_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['carrier_id'], message: 'Select your insurance carrier.' });
    }
  });

export type PatientInsuranceInput = z.infer<typeof patientInsuranceSchema>;

/** What the form holds. The carrier select can say "not listed", which the API never sees. */
export const insuranceFormSchema = z
  .object({ ...fields, carrier_id: z.string().min(1, 'Select your insurance carrier.') })
  .superRefine((value, ctx) => {
    if (value.carrier_id === CARRIER_NOT_LISTED && !value.carrier_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['carrier_name'],
        message: 'Enter the carrier name as printed on your card.',
      });
    }
  });

export type InsuranceFormValues = z.infer<typeof insuranceFormSchema>;

/** Form values to request body. Empty optional fields are left out rather than sent blank. */
export function toInsuranceInput(values: InsuranceFormValues): PatientInsuranceInput {
  const notListed = values.carrier_id === CARRIER_NOT_LISTED;
  return {
    insurance_type: values.insurance_type,
    carrier_id: notListed ? null : values.carrier_id,
    ...(notListed ? { carrier_name: values.carrier_name } : {}),
    member_id: values.member_id,
    ...(values.group_id ? { group_id: values.group_id } : {}),
    ...(values.policyholder_name ? { policyholder_name: values.policyholder_name } : {}),
    relationship: values.relationship,
  };
}

export function labelForInsuranceType(value: string): string {
  return INSURANCE_TYPES.find((type) => type.value === value)?.label ?? 'Insurance';
}

export function labelForRelationship(value: string | null): string | null {
  return RELATIONSHIPS.find((entry) => entry.value === value)?.label ?? null;
}
