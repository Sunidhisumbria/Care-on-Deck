import type { AddDependentInput } from '../schemas/dependent.schema';
import type { ProfileUpdateInput } from '@/lib/patient-profile';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/http/client';

import type {
  AppointmentDetail,
  AppointmentListStatus,
  Dependent,
  PatientProfile,
  SavedProvider,
  UpcomingAppointment,
} from '../types';

/** The patient's own record. Self-scoped server-side; no id is ever sent. */
export const patientApi = {
  profile: () => apiGet<PatientProfile>('/patients/profile'),
  updateProfile: (body: ProfileUpdateInput) => apiPatch<PatientProfile>('/patients/profile', body),
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
  savedProviders: () => apiGet<SavedProvider[]>('/patients/saved-providers'),
  saveProvider: (providerId: string) =>
    apiPost<{ provider_id: string; saved: true }>('/patients/saved-providers', { provider_id: providerId }),
  unsaveProvider: (providerId: string) =>
    apiDelete<{ provider_id: string; saved: false }>(
      `/patients/saved-providers/${encodeURIComponent(providerId)}`,
    ),
};
