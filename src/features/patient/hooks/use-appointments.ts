'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { marketplaceKeys, patientKeys } from '@/lib/query/keys';

import { patientApi } from '../api/patient.api';
import type { AppointmentListStatus } from '../types';

/**
 * One tab of the caller's appointments: upcoming soonest first, completed and
 * canceled most recent first. Self-scoped server-side.
 */
export function useAppointments(status: AppointmentListStatus) {
  return useQuery({
    queryKey: patientKeys.appointmentList(status),
    queryFn: () => patientApi.appointments(status),
  });
}

/** The dashboard's list. */
export function useUpcomingAppointments() {
  return useAppointments('upcoming');
}

/** One of the caller's appointments, for View Details. Someone else's reads as not found. */
export function useAppointmentDetail(id: string) {
  return useQuery({
    queryKey: patientKeys.appointment(id),
    queryFn: () => patientApi.appointment(id),
    retry: false,
  });
}

/**
 * Cancelling or moving a visit changes the patient's list, that appointment,
 * and the doctor's open slots -- all three are refetched, so nobody is offered
 * the time that was just freed or just taken as if nothing happened.
 */
function useRefreshAfterChange() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: patientKeys.appointments() });
    void queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
  };
}

export function useCancelAppointment(id: string) {
  const refresh = useRefreshAfterChange();

  return useMutation({
    mutationFn: (reason: string | null) => patientApi.cancelAppointment(id, { reason }),
    onSuccess: refresh,
  });
}

export function useRescheduleAppointment(id: string) {
  const refresh = useRefreshAfterChange();

  return useMutation({
    mutationFn: (startsAt: string) => patientApi.rescheduleAppointment(id, { starts_at: startsAt }),
    onSuccess: refresh,
  });
}
