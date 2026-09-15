/**
 * NOT REAL DATA.
 *
 * The whole booking flow is drawn against constants, because every endpoint
 * behind it is a stub and the reference tables are empty:
 *
 *   marketplace.search          501, and `specialties` has 0 rows
 *   booking.listVisitReasons    501, and `visit_reasons` has 0 rows
 *   scheduling.getBookableSlots 501, and there is no availability model
 *   booking.requestAppointment  501
 *
 * So this file is the seam. Every screen in the flow reads from here and
 * nowhere else; when the endpoints land, each constant is replaced by one
 * query and the components above it do not change. Delete this file and the
 * compiler lists exactly what is left to wire.
 */

export interface BookableProvider {
  id: string;
  name: string;
  specialty: string;
  visitModes: string;
  ratingAverage: number;
  ratingCount: number;
  city: string;
  distanceMiles: number;
  facility: string;
  insurers: string[];
  nextAvailable: string;
  languages: string;
}

export const PLACEHOLDER_PROVIDERS: BookableProvider[] = [
  {
    id: 'prov-sarah-johnson',
    name: 'Dr. Sarah Johnson',
    specialty: 'Primary Care',
    visitModes: 'In-Person',
    ratingAverage: 4.95,
    ratingCount: 120,
    city: 'Brooklyn, NY',
    distanceMiles: 3.1,
    facility: 'Downtown Medical Center',
    insurers: ['Aetna', 'Cigna', 'BCBS'],
    nextAvailable: 'Today · 3:30 PM',
    languages: 'English',
  },
  {
    id: 'prov-michael-lee',
    name: 'Dr. Michael Lee',
    specialty: 'Primary Care',
    visitModes: 'In-Person',
    ratingAverage: 4.95,
    ratingCount: 120,
    city: 'Brooklyn, NY',
    distanceMiles: 3.1,
    facility: 'Brooklyn Heart Clinic',
    insurers: ['United', 'BCBS', 'Humana'],
    nextAvailable: 'Today · 3:30 PM',
    languages: 'English',
  },
  {
    id: 'prov-priya-patel',
    name: 'Dr. Priya Patel',
    specialty: 'Primary Care',
    visitModes: 'In-Person',
    ratingAverage: 4.95,
    ratingCount: 120,
    city: 'Brooklyn, NY',
    distanceMiles: 3.1,
    facility: 'Queens Kids Clinic',
    insurers: ['Cigna', 'United', 'Aetna'],
    nextAvailable: 'Today · 3:30 PM',
    languages: 'English',
  },
  {
    id: 'prov-sarah-williams',
    name: 'Dr. Sarah Williams, MD',
    specialty: 'Primary Care',
    visitModes: 'In-Person, Video visit',
    ratingAverage: 4.9,
    ratingCount: 120,
    city: 'New York, NY',
    distanceMiles: 2.4,
    facility: 'Care Medical Center',
    insurers: ['Aetna', 'Cigna'],
    nextAvailable: 'Today · 3:30 PM',
    languages: 'English',
  },
];

export interface VisitReason {
  id: string;
  title: string;
  caption: string;
  icon: 'checkup' | 'cold' | 'chronic' | 'skin' | 'other';
}

export const PLACEHOLDER_VISIT_REASONS: VisitReason[] = [
  { id: 'general-checkup', title: 'General Check-up', caption: 'Routine annual physical or general health check', icon: 'checkup' },
  { id: 'cold-cough-flu', title: 'Cold, Cough or Flu', caption: 'Common cold, flu, sore throat, fever, etc.', icon: 'cold' },
  { id: 'chronic-follow-up', title: 'Chronic Condition Follow-up', caption: 'Diabetes, hypertension, asthma, etc.', icon: 'chronic' },
  { id: 'skin-allergy', title: 'Skin or Allergy Concern', caption: 'Rash, acne, allergies, itching, etc.', icon: 'skin' },
  { id: 'other', title: 'Other Health Concern', caption: "Not sure? Let us know and we'll help.", icon: 'other' },
];

/**
 * Times offered for any chosen day.
 *
 * A real availability model would vary these per provider, per day, and per
 * visit length, and would exclude anything already booked -- the database
 * already refuses overlapping appointments for a provider, so the picker has
 * to agree with it or people will hit a constraint error at the last step.
 */
export const PLACEHOLDER_SLOTS: string[] = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 AM',
  '01:00 AM', '02:00 AM', '03:00 AM', '04:00 AM',
  '05:00 AM', '06:00 AM',
];

export const PLACEHOLDER_FILTERS = {
  availability: ['Today', 'Tomorrow', 'This week'],
  distance: ['< 1 mile', '< 5 miles', '< 10 miles', '< 25 miles'],
  rating: ['4.5+', '4.0+', '3.5+'],
  insurance: ['Aetna', 'Cigna', 'BCBS', 'United', 'Humana'],
  gender: ['Male', 'Female'],
} as const;
