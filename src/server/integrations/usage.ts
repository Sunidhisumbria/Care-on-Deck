import { usageEvents } from '@/server/db/schema';
import type { Tx } from '@/server/db/tenant';

export type UsageMeter =
  | 'sms'
  | 'email'
  | 'otp'
  | 'telnyx'
  | 'postmark'
  | 'amazon_ses'
  | 'stripe'
  | 'google_maps'
  | 'amazon_rekognition';

/**
 * Records one metered call. Adapters call this themselves, inside the caller's
 * transaction, so metering cannot drift from the work that caused it -- if the
 * booking rolls back, so does the SMS charge for its confirmation.
 *
 * IA: 14. Control Center > Usage Tracking
 */
export async function meter(
  tx: Tx,
  input: {
    organizationId: string;
    facilityId?: string | null;
    meter: UsageMeter;
    quantity?: number;
    /** What the tenant is charged, in credits. */
    creditsCharged?: number;
    /** What the vendor charges us. Micro-cents, so fractions survive. */
    vendorCostMicros?: number;
    externalReference?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.insert(usageEvents).values({
    organizationId: input.organizationId,
    facilityId: input.facilityId ?? null,
    meter: input.meter,
    quantity: input.quantity ?? 1,
    creditsCharged: input.creditsCharged ?? 0,
    vendorCostMicros: input.vendorCostMicros ?? 0,
    externalReference: input.externalReference ?? null,
    metadata: input.metadata ?? null,
  });
}
