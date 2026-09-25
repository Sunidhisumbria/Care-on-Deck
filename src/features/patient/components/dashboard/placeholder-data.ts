/**
 * NOT REAL DATA.
 *
 * Care Progress is in the approved design and has nothing behind it: there is
 * no table, no endpoint, and no agreed model. Rather than invent a schema, the
 * screen renders these constants so the layout is real and reviewable while
 * the data model is still being decided. (Saved Providers was here too, and is
 * now real -- see patient_saved_providers.)
 *
 * Everything fake on this screen is in this file. When the endpoints land,
 * delete it -- whatever still imports from here is exactly what is left to
 * wire up.
 *
 * "50% completed", "Next due Mar 2027" and "Time for your annual checkup"
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
    id: 'annual-preventive-last',
    title: 'Annual Preventive Visit',
    caption: 'Completed Apr 12, 2026',
    icon: 'clipboard',
    completed: 1,
    total: 2,
    nextDue: 'Mar 2027',
    state: 'due',
    note: 'Book now to stay healthy.',
    action: { label: 'Book Now' },
  },
  {
    id: 'annual-preventive',
    title: 'Annual Preventive Visit',
    caption: 'Stay ahead, stay healthy.',
    icon: 'clipboard',
    completed: 1,
    total: 2,
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
