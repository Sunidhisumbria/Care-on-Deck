import { apiGet, apiPatch, apiPost } from '@/lib/http/client';

import type { InsuranceCarrier, PatientInsuranceInput, SavedInsurance, SavedInsuranceDetail } from '../types';

/** The insurance directory, and the signed-in patient's own cards. No patient id is ever sent. */
export const insuranceApi = {
  carriers: () => apiGet<InsuranceCarrier[]>('/insurance/carriers'),
  saved: () => apiGet<SavedInsurance[]>('/patients/insurance'),
  detail: (id: string) => apiGet<SavedInsuranceDetail>(`/patients/insurance/${id}`),
  create: (body: PatientInsuranceInput) => apiPost<SavedInsurance>('/patients/insurance', body),
  update: (id: string, body: PatientInsuranceInput) =>
    apiPatch<SavedInsurance>(`/patients/insurance/${id}`, body),
};
