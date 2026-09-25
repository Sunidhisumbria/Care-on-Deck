import { z } from 'zod';

import { isValidUsPhone, PHONE_RULE } from './phone';
import { normalizeWebsite } from './practice';

/**
 * Campaigns & Analytics (Pulse), as the dialogs and the server both check it.
 *
 * Spend is the campaign's budget. Nothing in the app buys ads yet, so the
 * budget the provider enters is the honest figure, and every cost metric is
 * that budget divided by what the campaign produced.
 */

export const CAMPAIGN_TYPES = [
  { value: 'seasonal', label: 'Seasonal promotion' },
  { value: 'new_service', label: 'New service launch' },
  { value: 'new_patient', label: 'New patient offer' },
  { value: 'awareness', label: 'Health awareness' },
  { value: 'referral', label: 'Referral program' },
  { value: 'other', label: 'Other' },
] as const;

export const AGENCY_TYPES = [
  { value: 'digital_marketing', label: 'Digital marketing' },
  { value: 'social_media', label: 'Social media' },
  { value: 'seo', label: 'SEO' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'pr', label: 'Public relations' },
  { value: 'other', label: 'Other' },
] as const;

type CampaignType = (typeof CAMPAIGN_TYPES)[number]['value'];
type AgencyType = (typeof AGENCY_TYPES)[number]['value'];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const createCampaignSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a campaign name.').max(200, 'Keep the name under 200 characters.'),
    starts_on: z.string().regex(DATE, 'Choose a start date.'),
    ends_on: z.string().regex(DATE, 'Choose an end date.'),
    campaign_type: z.enum(CAMPAIGN_TYPES.map((type) => type.value) as [CampaignType, ...CampaignType[]], {
      errorMap: () => ({ message: 'Select a campaign type.' }),
    }),
    /** Whole dollars as typed ("500" or "$500"); empty when there is no budget. */
    budget: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^\$?\d{1,7}(\.\d{1,2})?$/.test(value.replace(/,/g, '')), 'Enter an amount, like 500.'),
    description: z.string().trim().max(1000, 'Keep the description under 1,000 characters.').optional(),
    /** The agency running it, if any: one of the practice's active partners. */
    agency_id: z.string().uuid('Select an agency from the list.').or(z.literal('')).nullable().optional(),
  })
  .refine((value) => value.ends_on >= value.starts_on, { path: ['ends_on'], message: 'End on or after the start date.' });

export type CreateCampaignValues = z.infer<typeof createCampaignSchema>;

/** "$1,250.50" -> 125050. Null when no budget was given. */
export function budgetToCents(value: string | undefined): number | null {
  const cleaned = value?.replace(/[$,\s]/g, '');
  if (!cleaned) return null;
  return Math.round(Number(cleaned) * 100);
}

export const addAgencySchema = z.object({
  name: z.string().trim().min(2, 'Enter the agency name.').max(200),
  agency_type: z.enum(AGENCY_TYPES.map((type) => type.value) as [AgencyType, ...AgencyType[]], {
    errorMap: () => ({ message: 'Select the agency type.' }),
  }),
  contact_name: z.string().trim().min(2, 'Enter a contact name.').max(200),
  contact_email: z.string().trim().min(1, 'Enter a contact email.').email('Enter a valid email address.').max(320),
  phone: z.string().trim().optional().refine((value) => !value || isValidUsPhone(value), PHONE_RULE),
  website: z
    .string()
    .trim()
    .max(300)
    .optional()
    .refine((value) => !value || normalizeWebsite(value) !== null, 'Enter a website address, like agency.com.'),
  notes: z.string().trim().max(1000, 'Keep the notes under 1,000 characters.').optional(),
});

export type AddAgencyValues = z.infer<typeof addAgencySchema>;

export function labelFor(list: ReadonlyArray<{ value: string; label: string }>, value: string | null): string {
  return list.find((entry) => entry.value === value)?.label ?? '—';
}
