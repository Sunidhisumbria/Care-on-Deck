/**
 * NOT REAL DATA.
 *
 * Care Progress and Saved Providers are both in the approved design, and
 * neither has anything behind it: there is no table, no endpoint, and no
 * agreed model for either. Rather than invent two schemas, the screen renders
 * these constants so the layout is real and reviewable while the data model is
 * still being decided.
 *
 * Everything fake on this screen is in this file. When the endpoints land,
 * delete it -- whatever still imports from here is exactly what is left to
 * wire up.
 *
 * Care Progress is the harder of the two and the reason this file exists.
 * "2 of 2 completed", "Next due Jan 2027" and "Time for your annual checkup"
 * describe clinical recall: what is due, on what cadence, for whom. Guessing
 * at that means migrating patient data twice.
 */

export interface CareProgressItem {
  id: string;
  title: string;
  caption: string;
  icon: 'tooth' | 'clipboard' | 'eye';
  completed: number;
  total: number;
  nextDue: string;
  /** `due` is the one that needs the patient to act. */
  state: 'complete' | 'due';
  note: string;
  action?: { label: string };
}

export const PLACEHOLDER_CARE_PROGRESS: CareProgressItem[] = [
  {
    id: 'dental-cleaning',
    title: 'Dental Cleaning',
    caption: 'Keep your smile healthy',
    icon: 'tooth',
    completed: 2,
    total: 2,
    nextDue: 'Jan 2027',
    state: 'complete',
    note: "You're on track with your dental care.",
  },
  {
    id: 'annual-preventive',
    title: 'Annual Preventive Visit',
    caption: 'Stay ahead, stay healthy',
    icon: 'clipboard',
    completed: 0,
    total: 1,
    nextDue: 'Mar 2027',
    state: 'due',
    note: 'Book now to stay healthy.',
    action: { label: 'Book Now' },
  },
  {
    id: 'vision-exam',
    title: 'Vision Exam',
    caption: 'Clearer vision, brighter days',
    icon: 'eye',
    completed: 1,
    total: 1,
    nextDue: 'Apr 2027',
    state: 'complete',
    note: "You're all set with your vision care.",
  },
];

export interface SavedProvider {
  id: string;
  name: string;
  specialty: string;
  ratingAverage: number;
  ratingCount: number;
  facility: string;
  address: string;
}

export const PLACEHOLDER_SAVED_PROVIDERS: SavedProvider[] = [
  {
    id: 'saved-1',
    name: 'Dr. Sarah Johnson',
    specialty: 'Dermatology',
    ratingAverage: 4.95,
    ratingCount: 90,
    facility: 'CareOndeck Medical Center',
    address: 'Sun City, Bandlaguda Jagir, Telangana 500086',
  },
  {
    id: 'saved-2',
    name: 'Dr. Sarah Johnson',
    specialty: 'Dermatology',
    ratingAverage: 4.95,
    ratingCount: 90,
    facility: 'CareOndeck Medical Center',
    address: 'Sun City, Bandlaguda Jagir, Telangana 500086',
  },
  {
    id: 'saved-3',
    name: 'Dr. Sarah Johnson',
    specialty: 'Dermatology',
    ratingAverage: 4.95,
    ratingCount: 90,
    facility: 'CareOndeck Medical Center',
    address: 'Sun City, Bandlaguda Jagir, Telangana 500086',
  },
];
