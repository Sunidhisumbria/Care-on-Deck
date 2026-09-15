import type { StatusTone } from '@/components/ui/status-badge';

/**
 * How an appointment status is shown, decided once.
 *
 * The dashboard and the appointments list used to decide separately, and did
 * not agree: one showed a requested visit in amber, the other in green, as if
 * it were already confirmed.
 */
export function appointmentStatusTone(status: string): StatusTone {
  if (status === 'confirmed' || status === 'checked_in' || status === 'completed') return 'success';
  if (status === 'requested' || status === 'rescheduled') return 'warning';
  if (status === 'cancelled' || status === 'no_show') return 'danger';
  return 'brand';
}

/** `checked_in` -> "Checked in". */
export function appointmentStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/^./, (first) => first.toUpperCase());
}
