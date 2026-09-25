'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usePracticeReady } from '@/features/practice/hooks';
import type { AddAgencyValues, CreateCampaignValues } from '@/lib/pulse';
import { pulseKeys } from '@/lib/query/keys';

import { pulseApi } from './api';

/** Every Pulse read waits for the practice to be the session's active organization. */
export function usePulseOverview() {
  const { ready } = usePracticeReady();
  return useQuery({ queryKey: pulseKeys.overview(), queryFn: pulseApi.overview, enabled: ready });
}

export function useCampaigns() {
  const { ready } = usePracticeReady();
  return useQuery({ queryKey: pulseKeys.campaigns(), queryFn: pulseApi.campaigns, enabled: ready });
}

export function useCampaign(id: string) {
  const { ready } = usePracticeReady();
  return useQuery({ queryKey: pulseKeys.campaign(id), queryFn: () => pulseApi.campaign(id), enabled: ready, retry: false });
}

export function useAgencies() {
  const { ready } = usePracticeReady();
  return useQuery({ queryKey: pulseKeys.agencies(), queryFn: pulseApi.agencies, enabled: ready });
}

/** A new campaign or agency changes the overview and the lists, so all of Pulse refetches. */
function useRefreshPulse() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: pulseKeys.all });
}

export function useCreateCampaign() {
  const refresh = useRefreshPulse();
  return useMutation({ mutationFn: (values: CreateCampaignValues) => pulseApi.createCampaign(values), onSuccess: refresh });
}

export function useAddAgency() {
  const refresh = useRefreshPulse();
  return useMutation({ mutationFn: (values: AddAgencyValues) => pulseApi.addAgency(values), onSuccess: refresh });
}

export function useAgency(id: string) {
  const { ready } = usePracticeReady();
  return useQuery({ queryKey: pulseKeys.agency(id), queryFn: () => pulseApi.agency(id), enabled: ready, retry: false });
}

export function useUpdateAgency(id: string) {
  const refresh = useRefreshPulse();
  return useMutation({ mutationFn: (values: AddAgencyValues) => pulseApi.updateAgency(id, values), onSuccess: refresh });
}

export function useRemoveAgency(id: string) {
  const refresh = useRefreshPulse();
  return useMutation({ mutationFn: () => pulseApi.removeAgency(id), onSuccess: refresh });
}
