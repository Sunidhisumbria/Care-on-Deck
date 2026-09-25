/**
 * Telling the doctor what a patient did: requested, moved or cancelled a visit.
 *
 * A notification row belongs to its recipient (see rls.sql), and the patient
 * acting here is not the recipient and not a member of the practice, so the
 * write is elevated. It carries nothing the doctor could not already see on
 * the appointment itself.
 */
import { eq } from 'drizzle-orm';

import { notifications } from '@/server/db/schema/notifications';
import { providers } from '@/server/db/schema/providers';
import { withElevated, type Tx } from '@/server/db/tenant';

export type ProviderNotice = 'new_request' | 'rescheduled' | 'cancelled';

export async function notifyProvider(
  tx: Tx,
  input: { providerId: string | null; organizationId: string; appointmentId: string; kind: ProviderNotice; title: string; body: string },
): Promise<void> {
  if (!input.providerId) return;
  await withElevated(tx, async () => {
    const [provider] = await tx.select({ userId: providers.userId }).from(providers).where(eq(providers.id, input.providerId!)).limit(1);
    // A provider who has not claimed their profile has no one to tell yet.
    if (!provider?.userId) return;
    await tx.insert(notifications).values({
      organizationId: input.organizationId,
      recipientUserId: provider.userId,
      category: input.kind === 'new_request' ? 'action_item' : 'appointment_update',
      title: input.title,
      body: input.body,
      actionUrl: `/provider/appointments/${input.appointmentId}`,
      actionLabel: 'View appointment',
      requiresAction: input.kind === 'new_request',
      subjectType: 'appointment',
      subjectId: input.appointmentId,
      data: { kind: input.kind },
    });
  });
}

/** "Oct 18, 2026 at 10:30 AM", on the clinic's clock. */
export function clinicWhen(instant: Date, timezone: string): string {
  const date = instant.toLocaleDateString('en-US', { timeZone: timezone, month: 'short', day: 'numeric', year: 'numeric' });
  const time = instant.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' });
  return `${date} at ${time}`;
}
