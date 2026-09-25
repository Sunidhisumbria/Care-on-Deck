'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { authApi } from '@/features/auth/api/auth.api';
import { useCurrentUser } from '@/features/auth/hooks';
import { authKeys, marketplaceKeys, practiceKeys } from '@/lib/query/keys';

import { practiceApi } from './api';
import type { LicenseValues } from '@/lib/license';
import type { PracticeValues } from '@/lib/practice';
import type { ProfileValues } from '@/lib/profile';
import type { ScheduleValues } from '@/lib/schedule';

import type { BookingHold, CancelReason, CreateHoldInput, PracticeTab } from './types';

/**
 * Every practice endpoint acts inside an organization, and a session starts
 * without one. A provider belongs to one practice, so it is made active here
 * automatically; `ready` holds the practice screens back until it is.
 */
export function usePracticeReady() {
  const queryClient = useQueryClient();
  const { data, isPending } = useCurrentUser();
  const active = data?.active_organization_id ?? null;
  const first = data?.memberships[0]?.organization_id ?? null;

  const activate = useMutation({
    mutationFn: practiceApi.activate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.currentUser() }),
  });

  useEffect(() => {
    if (!isPending && !active && first && activate.isIdle) activate.mutate(first);
  }, [isPending, active, first, activate]);

  return {
    ready: Boolean(active),
    /** Signed in, but a member of no practice: nothing here can load. */
    noPractice: !isPending && !active && !first,
  };
}

export function useDashboardSummary() {
  const { ready } = usePracticeReady();
  return useQuery({ queryKey: practiceKeys.summary(), queryFn: practiceApi.summary, enabled: ready });
}

export function useActionItems() {
  const { ready } = usePracticeReady();
  return useQuery({ queryKey: practiceKeys.actionItems(), queryFn: practiceApi.actionItems, enabled: ready });
}

export function usePracticeAppointments(tab: PracticeTab, q: string) {
  const { ready } = usePracticeReady();
  return useQuery({
    queryKey: practiceKeys.appointmentList(tab, q),
    queryFn: () => practiceApi.appointments(tab, q),
    enabled: ready,
  });
}

export function usePracticeAppointment(id: string) {
  const { ready } = usePracticeReady();
  return useQuery({
    queryKey: practiceKeys.appointment(id),
    queryFn: () => practiceApi.appointment(id),
    enabled: ready,
    retry: false,
  });
}

/**
 * A change to one appointment changes the lists, the dashboard's numbers and
 * the doctor's open slots, so all of them are refetched.
 */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: practiceKeys.all });
    void queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
  };
}

export function useConfirmAppointment() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => practiceApi.confirm(id), onSuccess: refresh });
}

export function useCancelPracticeAppointment(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: { reason: CancelReason; message: string | null }) => practiceApi.cancel(id, body),
    onSuccess: refresh,
  });
}

export function useReschedulePracticeAppointment(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: { starts_at: string; notify: boolean }) => practiceApi.reschedule(id, body),
    onSuccess: refresh,
  });
}

export function useMarkNoShow() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => practiceApi.markNoShow(id), onSuccess: refresh });
}

/** The calendar between two clinic dates. Kept on screen while the next range loads. */
export function usePracticeCalendar(from: string, to: string) {
  const { ready } = usePracticeReady();
  return useQuery({
    queryKey: practiceKeys.calendar(from, to),
    queryFn: () => practiceApi.calendar(from, to),
    enabled: ready,
    placeholderData: (previous) => previous,
  });
}

/**
 * Pausing and resuming change which times patients can book, so the open
 * slots (marketplace) are refetched along with the practice's own views.
 */
export function useCreateHold() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (body: CreateHoldInput) => practiceApi.createHold(body), onSuccess: refresh });
}

/** Resume: every active hold is released. */
export function useResumeBookings() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (holds: BookingHold[]) => Promise.all(holds.map((hold) => practiceApi.releaseHold(hold.id))),
    onSettled: refresh,
  });
}

/** The provider's own profile, for Personal Information. */
export function useProviderProfile() {
  const { ready } = usePracticeReady();
  return useQuery({ queryKey: practiceKeys.profile(), queryFn: practiceApi.profile, enabled: ready, retry: false });
}

/** Personal details > photo. The answer is the updated profile, so it replaces the cached one. */
export function useUpdateProviderPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string | null) => practiceApi.updatePhoto(mediaId),
    onSuccess: (profile) => queryClient.setQueryData(practiceKeys.profile(), profile),
  });
}

export function useRequestContactChange() {
  return useMutation({ mutationFn: authApi.changeContact });
}

/** The account's email or phone changed: the header, the menu and the profile all show it. */
export function useConfirmContactChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.confirmContact,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      void queryClient.invalidateQueries({ queryKey: practiceKeys.profile() });
    },
  });
}

/** A section of Personal Information saved: the answer is the whole updated profile. */
function useProfileSection<T>(save: (values: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: save,
    onSuccess: (profile) => {
      queryClient.setQueryData(practiceKeys.profile(), profile);
      // The practice's name and address are on the dashboard and in search.
      void queryClient.invalidateQueries({ queryKey: practiceKeys.summary() });
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
    },
  });
}

export function useUpdatePractice() {
  return useProfileSection((values: PracticeValues) => practiceApi.updatePractice(values));
}

export function useUpdateMedia() {
  return useProfileSection((values: ProfileValues) => practiceApi.updateMedia(values));
}

export function useUpdateLicense() {
  return useProfileSection((values: LicenseValues) => practiceApi.updateLicense(values));
}

/** The weekly hours as the Availability form edits them. Always fresh when the editor opens. */
export function useWeeklySchedule(enabled: boolean) {
  return useQuery({
    queryKey: practiceKeys.weeklySchedule(),
    queryFn: practiceApi.weeklySchedule,
    enabled,
    refetchOnMount: 'always',
  });
}

/** New hours change the profile, the calendar and which times patients can book. */
export function useUpdateSchedule() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (values: ScheduleValues) => practiceApi.updateSchedule(values),
    onSuccess: refresh,
  });
}
