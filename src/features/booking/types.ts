/**
 * A provider as `/marketplace/search` returns them. Mirrors `ProviderCard` on
 * the server; the snake_case is the API's, kept rather than translated so the
 * two can be read side by side.
 */
export interface BookableProvider {
  id: string;
  slug: string | null;
  name: string;
  credentials: string | null;
  specialty: string | null;
  years_experience: number | null;
  languages: string[];
  accepting_new_patients: boolean;
  /** Null until patients have left reviews. */
  rating: { average: number; count: number } | null;
  facility: {
    id: string;
    name: string;
    office_type: string;
    city: string | null;
    state: string | null;
    timezone: string;
  };
  insurers: string[];
  /** UTC instant of the first open slot, or null when nothing is open this month. */
  next_available: string | null;
}

export interface ProviderSearchResult {
  providers: BookableProvider[];
  total: number;
}

export interface ProviderSearchFilters {
  q?: string;
  insurance_carrier_id?: string;
  availability?: 'today' | 'tomorrow' | 'week';
  accepting_new_patients?: boolean;
  sort?: 'recommended' | 'soonest';
  limit?: number;
  offset?: number;
}

/** One open appointment time, as the availability endpoint returns it. */
export interface Slot {
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
}

export interface ProviderAvailability {
  provider_id: string;
  /** The clinic's zone. Every slot is displayed in it, never the reader's. */
  timezone: string;
  /** Only days with something open; a missing date cannot be booked. */
  days: { date: string; slots: Slot[] }[];
}

/** The slot a patient picked, carried through the rest of the flow. */
export interface ChosenSlot extends Slot {
  timezone: string;
}

/** A reason the chosen practice offers. Practices own their own list. */
export interface VisitReasonOption {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
}

export interface BookingRequest {
  provider_id: string;
  starts_at: string;
  visit_reason_id?: string | null;
  patient_note?: string | null;
  payment: { kind: 'self_pay' } | { kind: 'insurance'; patient_insurance_id: string };
}

/** What the server answers with once the appointment exists. */
export interface BookingConfirmation {
  reference: string;
  status: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  provider_name: string;
  facility_name: string;
}
