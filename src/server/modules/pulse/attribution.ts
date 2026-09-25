/**
 * Crediting bookings to campaigns. A tracking link sets this cookie; a booking
 * made while it is present is credited to that campaign -- if the campaign
 * belongs to the practice being booked and is running. Anything else is
 * ignored, so a stale or forged cookie can never credit the wrong practice.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { DateTime } from 'luxon';

import { campaigns } from '@/server/db/schema/pulse';
import { withElevated, type Tx } from '@/server/db/tenant';

export const CAMPAIGN_COOKIE = 'cod_campaign';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The campaign to credit, or null. Elevated: a patient cannot read campaigns, and learns nothing here. */
export async function creditableCampaign(tx: Tx, campaignId: string | null | undefined, organizationId: string): Promise<string | null> {
  if (!campaignId || !UUID.test(campaignId)) return null;
  const [campaign] = await withElevated(tx, () =>
    tx
      .select({ id: campaigns.id, endsOn: campaigns.endsOn })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.organizationId, organizationId),
          eq(campaigns.status, 'active'),
          isNull(campaigns.deletedAt),
        ),
      )
      .limit(1),
  );
  if (!campaign) return null;
  // A booking made after the campaign ended is not its doing.
  if (campaign.endsOn && campaign.endsOn < DateTime.now().toISODate()!) return null;
  return campaign.id;
}
