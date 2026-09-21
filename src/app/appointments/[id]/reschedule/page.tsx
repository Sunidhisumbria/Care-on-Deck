'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ChevronLeft } from '@/components/ui/icons';
import { SlotPicker } from '@/features/booking/components/slot-picker';
import type { Slot } from '@/features/booking/types';
import { AccountHero } from '@/features/patient/components/account-hero';
import { useAppointmentDetail, useRescheduleAppointment } from '@/features/patient/hooks';
import { clinicZoneName, formatClinicDate, formatClinicTime } from '@/lib/clinic-time';
import { Busy, LoadingPanel } from '@/components/ui/spinner';

/**
 * IA: 3. Appointments > Reschedule.
 *
 * The same calendar as booking, for the same doctor. Confirming books the new
 * time and supersedes the old appointment in one step on the server, so there
 * is never a moment with both times held or neither.
 */
export default function RescheduleAppointmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isPending, error } = useAppointmentDetail(params.id);
  const move = useRescheduleAppointment(params.id);
  const [slot, setSlot] = useState<Slot | null>(null);

  const zone = data?.facility?.timezone ?? 'UTC';

  async function confirm() {
    if (!slot) return;
    const moved = await move.mutateAsync(slot.starts_at);
    toast.success(
      `Moved to ${formatClinicDate(moved.starts_at, zone, 'medium')} at ${formatClinicTime(moved.starts_at, zone)}.`,
    );
    router.replace(`/appointments/${moved.id}`);
  }

  return (
    <>
      <AccountHero
        title="Reschedule Appointment"
        subtitle="Pick a new date and time. Your current booking stays until you confirm."
      />

      <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
        <Link
          href={`/appointments/${params.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to appointment
        </Link>

        <div className="mt-4">
          {isPending ? (
            <LoadingPanel label="Loading your appointment…" rows={5} />
          ) : error || !data ? (
            <p className="rounded-card border border-line bg-white p-8 text-center text-sm text-ink-500">
              That appointment could not be found.
            </p>
          ) : !data.can_change || !data.provider ? (
            <p className="rounded-card border border-line bg-white p-8 text-center text-sm text-ink-500">
              This appointment can no longer be rescheduled online. Please contact the practice.
            </p>
          ) : (
            <>
              <div className="mb-6 rounded-card border border-line bg-white p-4 text-sm">
                <p className="text-ink-500">Currently booked</p>
                <p className="mt-0.5 font-semibold text-ink-900">
                  {data.provider.name} &middot; {formatClinicDate(data.starts_at, zone, 'medium')} at{' '}
                  {formatClinicTime(data.starts_at, zone)} {clinicZoneName(data.starts_at, zone)}
                </p>
              </div>

              <SlotPicker
                providerId={data.provider.id}
                fallbackTimezone={zone}
                value={slot}
                onChange={(next) => setSlot(next)}
              />

              {move.error ? (
                <p className="mt-4 rounded-field bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  {move.error instanceof Error ? move.error.message : 'That could not be moved. Try again.'}
                </p>
              ) : null}

              <button
                type="button"
                disabled={!slot || move.isPending}
                onClick={() => void confirm()}
                className="mt-5 w-full rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {move.isPending
                  ? <Busy>Moving your appointment…</Busy>
                  : slot
                    ? `Confirm ${formatClinicDate(slot.starts_at, zone, 'medium')} at ${formatClinicTime(slot.starts_at, zone)}`
                    : 'Pick a new time'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
