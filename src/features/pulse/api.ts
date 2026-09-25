import { apiGet, apiPatch, apiPost } from '@/lib/http/client';
import type { AddAgencyValues, CreateCampaignValues } from '@/lib/pulse';

import type { AgencyDetail, AgencySummary, CampaignSummary, PulseOverview } from './types';

export const pulseApi = {
  overview: () => apiGet<PulseOverview>('/pulse/overview'),
  campaigns: () => apiGet<CampaignSummary[]>('/pulse/campaigns'),
  campaign: (id: string) => apiGet<CampaignSummary>(`/pulse/campaigns/${encodeURIComponent(id)}`),
  createCampaign: (values: CreateCampaignValues) => apiPost<CampaignSummary>('/pulse/campaigns', values),
  agencies: () => apiGet<AgencySummary[]>('/pulse/agencies'),
  addAgency: (values: AddAgencyValues) => apiPost<AgencySummary>('/pulse/agencies', values),
  agency: (id: string) => apiGet<AgencyDetail>(`/pulse/agencies/${encodeURIComponent(id)}`),
  updateAgency: (id: string, values: AddAgencyValues) => apiPatch<AgencyDetail>(`/pulse/agencies/${encodeURIComponent(id)}`, values),
  removeAgency: (id: string) => apiPost<AgencyDetail>(`/pulse/agencies/${encodeURIComponent(id)}/remove`),
};
