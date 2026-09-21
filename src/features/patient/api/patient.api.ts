import type { AddDependentInput } from '../schemas/dependent.schema';
import { apiGet, apiPost } from '@/lib/http/client';

import type {
  AppointmentDetail,
  AppointmentListStatus,
  Dependent,
  PatientProfile,
  UpcomingAppointment,
} from '../types';

/** The patient's own record. Self-scoped server-side; no id is ever sent. */
export const patientApi = {
  profile: () => apiGet<PatientProfile>('/patients/profile'),
  dependents: () => apiGet<Dependent[]>('/patients/dependents'),
  addDependent: (body: AddDependentInput) => apiPost<Dependent>('/patients/dependents', body),
  appointments: (status: AppointmentListStatus = 'upcoming') =>
    apiGet<UpcomingAppointment[]>('/patients/appointments', { status }),
  appointment: (id: string) =>
    apiGet<AppointmentDetail>(`/patients/appointments/${encodeURIComponent(id)}`),
  cancelAppointment: (id: string, body: { reason?: string | null }) =>
    apiPost<{ id: string; status: 'cancelled' }>(
      `/patients/appointments/${encodeURIComponent(id)}/cancel`,
      body,
    ),
  rescheduleAppointment: (id: string, body: { starts_at: string }) =>
    apiPost<{ id: string; reference: string; status: 'requested'; starts_at: string; ends_at: string }>(
      `/patients/appointments/${encodeURIComponent(id)}/reschedule`,
      body,
    ),
};
