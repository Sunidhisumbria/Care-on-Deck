/** Insurance wire types. Snake_case, matching the API. */
import type { InsuranceType, Relationship } from '@/lib/patient-insurance';

export type { InsuranceFormValues, InsuranceType, PatientInsuranceInput, Relationship } from '@/lib/patient-insurance';

/** One entry in the insurance directory. */
export interface InsuranceCarrier {
  id: string;
  name: string;
  slug: string;
}

/** A saved card as lists show it: the member ID is only ever its last four. */
export interface SavedInsurance {
  id: string;
  insurance_type: InsuranceType;
  carrier: { id: string | null; name: string };
  member_id_last4: string | null;
  group_id: string | null;
  policyholder_name: string | null;
  relationship: Relationship | null;
  is_primary: boolean;
  /** The photo of the card's front, when one was uploaded. */
  card_media_id: string | null;
  updated_at: string;
}

/** A card opened for editing, with the full member ID. */
export interface SavedInsuranceDetail extends SavedInsurance {
  member_id: string;
}
