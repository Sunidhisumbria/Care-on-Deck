import type { AddDependentInput } from '../schemas/dependent.schema';
import { apiGet, apiPost } from '@/lib/http/client';

import type { Dependent, PatientProfile, UpcomingAppointment } from '../types';

/** The patient's own record. Self-scoped server-side; no id is ever sent. */
export const patientApi = {
  profile: () => apiGet<PatientProfile>('/patients/profile'),
  dependents: () => apiGet<Dependent[]>('/patients/dependents'),
  addDependent: (body: AddDependentInput) => apiPost<Dependent>('/patients/dependents', body),
  appointments: () => apiGet<UpcomingAppointment[]>('/patients/appointments'),
};
