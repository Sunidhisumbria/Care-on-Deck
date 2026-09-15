/** IA: 3. Patient Account. Wire shapes, snake_case like the rest of the API. */

export interface PatientAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
}

export interface PatientInsurance {
  carrier: string | null;
  plan: string | null;
  member_id_last4: string | null;
}

export interface PatientProfile {
  patient_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  location_label: string | null;
  address: PatientAddress | null;
  insurance: PatientInsurance | null;
}

export interface Dependent {
  gender: string | null;
  phone: string | null;
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  relationship: string;
  can_book_on_behalf: boolean;
}

/**
 * One upcoming visit, as the dashboard shows it.
 *
 * Flattened by the API rather than nested Drizzle rows: the card needs a
 * provider name, a specialty and a facility address, and joining those on the
 * client would mean three more round trips for a list of three.
 */
export interface UpcomingAppointment {
  id: string;
  reference: string;
  status: string;
  starts_at: string;
  duration_minutes: number;
  provider: {
    name: string;
    specialty: string | null;
    rating_average: number | null;
    rating_count: number;
  } | null;
  facility: { name: string; address: string | null } | null;
}
