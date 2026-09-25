import { apiGet, apiPatch, apiPost, http } from '@/lib/http/client';
import type { LicenseValues } from '@/lib/license';
import type { PracticeValues } from '@/lib/practice';
import type { ProfileValues } from '@/lib/profile';
import type { ScheduleValues } from '@/lib/schedule';

import type {
  ActionItem,
  BookingHold,
  CreateHoldInput,
  PracticeCalendar,
  CancelReason,
  DashboardSummary,
  PracticeAppointment,
  PracticeAppointmentDetail,
  PracticeTab,
  ProviderProfile,
} from './types';

/** The practice's own data. Scoped server-side to the session's active organization. */
export const practiceApi = {
  activate: (organizationId: string) => apiPost('/auth/organizations', { organization_id: organizationId }),
  profile: () => apiGet<ProviderProfile>('/practice/profile'),
  updatePractice: (values: PracticeValues) => put<ProviderProfile>('/practice/profile/practice', values),
  updateMedia: (values: ProfileValues) => put<ProviderProfile>('/practice/profile/media', values),
  updateLicense: (values: LicenseValues) => put<ProviderProfile>('/practice/profile/license', values),
  weeklySchedule: () => apiGet<ScheduleValues>('/scheduling/availability'),
  updateSchedule: (values: ScheduleValues) =>
    put<{ schedule: ScheduleValues; conflicts: Array<{ id: string; starts_at: string; patient_name: string }> }>(
      '/scheduling/availability',
      values,
    ),
  updatePhoto: (mediaId: string | null) =>
    apiPatch<ProviderProfile>('/practice/profile', { headshot_media_id: mediaId }),
  summary: () => apiGet<DashboardSummary>('/dashboard/summary'),
  actionItems: () => apiGet<ActionItem[]>('/dashboard/action-items'),
  appointments: (tab: PracticeTab, q: string) =>
    apiGet<PracticeAppointment[]>('/appointments', { tab, ...(q ? { q } : {}) }),
  appointment: (id: string) => apiGet<PracticeAppointmentDetail>(`/appointments/${encodeURIComponent(id)}`),
  confirm: (id: string) => apiPost<PracticeAppointmentDetail>(`/appointments/${encodeURIComponent(id)}/confirm`),
  cancel: (id: string, body: { reason: CancelReason; message: string | null }) =>
    apiPost<PracticeAppointmentDetail>(`/appointments/${encodeURIComponent(id)}/cancel`, body),
  reschedule: (id: string, body: { starts_at: string; notify: boolean }) =>
    apiPost<PracticeAppointmentDetail>(`/appointments/${encodeURIComponent(id)}/reschedule`, body),
  calendar: (from: string, to: string) => apiGet<PracticeCalendar>('/scheduling/calendar', { from, to }),
  createHold: (body: CreateHoldInput) => apiPost<BookingHold>('/scheduling/holds', body),
  releaseHold: (id: string) => apiPost<BookingHold>(`/scheduling/holds/${encodeURIComponent(id)}/release`),
  markNoShow: (id: string) => apiPost<PracticeAppointmentDetail>(`/appointments/${encodeURIComponent(id)}/no-show`),
};

/** PUT through the shared client, unwrapped from the response envelope like the helpers above. */
async function put<T>(url: string, body: unknown): Promise<T> {
  const response = await http.put<{ data: T }>(url, body);
  return response.data.data;
}
