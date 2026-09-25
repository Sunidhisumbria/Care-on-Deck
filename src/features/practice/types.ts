/** The practice-side wire types. Snake_case, matching the API. */

export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'rescheduled'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'declined';

export type PracticeTab = 'upcoming' | 'pending' | 'completed' | 'canceled' | 'no_show';

export interface DashboardSummary {
  greeting_name: string | null;
  facility: { name: string; timezone: string } | null;
  today: string;
  today_appointments: { total: number; upcoming: number };
  patients_today: number;
  pending_requests: number;
  revenue_this_month_cents: number | null;
  schedule: Array<{ id: string; starts_at: string; patient_name: string; problem: string | null; status: AppointmentStatus }>;
}

export interface ActionItem {
  kind: 'new_request' | 'reschedule' | 'no_show';
  appointment_id: string;
  patient_name: string;
  starts_at: string;
  timezone: string;
  occurred_at: string;
}

export interface PracticeAppointment {
  id: string;
  reference: string;
  status: AppointmentStatus;
  starts_at: string;
  ends_at: string;
  timezone: string;
  patient: { name: string };
  booking_for: 'self' | 'dependent';
  problem: string | null;
  insurance: string | null;
}

export interface PracticeAppointmentDetail extends PracticeAppointment {
  patient: {
    name: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    age: number | null;
    address: string | null;
  };
  patient_note: string | null;
  provider_id: string | null;
  can_confirm: boolean;
  can_change: boolean;
  can_mark_no_show: boolean;
}

/** The Cancel dialog's reasons. Mirrors CANCEL_REASONS on the server. */
export const CANCEL_REASONS = [
  'Provider unavailable',
  'Schedule conflict',
  'Clinic closure',
  'Patient request',
  'Other',
] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export interface BookingHold {
  id: string;
  scope: 'today' | 'this_week' | 'this_month' | 'custom';
  starts_at: string;
  /** Exclusive: the first instant bookings are open again. */
  ends_at: string;
  reason: string | null;
  provider_id: string | null;
}

export interface PracticeCalendar {
  timezone: string;
  slot_minutes: number;
  /** "HH:MM"; null when no working hours are set. */
  hours: { start: string; end: string } | null;
  /** 0 = Sunday … 6 = Saturday. */
  working_days: number[];
  appointments: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    patient_name: string;
    problem: string | null;
    status: AppointmentStatus;
  }>;
  holds: BookingHold[];
}

export type CreateHoldInput =
  | { scope: 'today' | 'this_week' | 'this_month' }
  | { scope: 'custom'; from: string; to: string; reason: string | null };

export interface ProfileFile {
  media_id: string;
  content_type: string;
}

/** The provider's live profile. Mirrors ProviderProfile on the server. */
export interface ProviderProfile {
  name: string;
  credentials: string | null;
  email: string | null;
  phone: string | null;
  headshot: ProfileFile | null;
  bio: string | null;
  years_experience: number | null;
  npi: string | null;
  specialty: string | null;
  practice: {
    name: string;
    office_type: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    timezone: string;
    address: { line1: string | null; line2: string | null; city: string | null; state: string | null; postal_code: string | null };
  } | null;
  license: { state: string; license_number: string; expires_on: string | null; status: string; document: ProfileFile | null } | null;
  certificates: ProfileFile[];
  availability: {
    slot_minutes: number | null;
    days: Array<{ weekday: number; start: string; end: string }>;
    breaks: Array<{ start: string; end: string }>;
  };
  insurance: { self_pay_only: boolean; carriers: string[] };
}
