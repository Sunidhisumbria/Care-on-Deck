/**
 * Paid acquisition: campaigns, agencies and the numbers behind them.
 *
 * Clicks come from `campaign_daily_metrics`, never from a live scan of
 * `campaign_clicks` -- the raw click stream is retained briefly and is far too
 * large to aggregate on a dashboard load. Recording a click bumps the day's
 * row in the same transaction. Requests and confirmations are counted from the
 * appointments credited to a campaign, which is exact and small.
 *
 * Spend is the campaign's budget: nothing here buys ads yet, so what the
 * provider planned to spend is the honest figure until an ad platform reports
 * real spend into `campaign_daily_metrics.spend_cents`.
 *
 * IA: 9. Pulse
 */
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { customAlphabet } from 'nanoid';

import { budgetToCents, type AddAgencyValues, type CreateCampaignValues } from '@/lib/pulse';
import { normalizeUsPhone, normalizeWebsite } from '@/lib/practice';
import { slugify } from '@/lib/slug';
import type { RequestContext } from '@/server/auth/context';
import { appointments } from '@/server/db/schema/appointments';
import { facilities } from '@/server/db/schema/organizations';
import { providerFacilities, providers } from '@/server/db/schema/providers';
import {
  agencies,
  agencyClients,
  agencyEngagements,
  campaignClicks,
  campaignDailyMetrics,
  campaigns,
  campaignTrackingLinks,
} from '@/server/db/schema/pulse';
import { withElevated, type Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { notImplemented } from '@/server/http/response';
import { recordAudit } from '@/server/observability/audit';

type CampaignRow = typeof campaigns.$inferSelect;

export interface CampaignStats {
  spend_cents: number;
  clicks: number;
  requests: number;
  confirmed: number;
  /** Null where the divisor is zero -- "no clicks yet", not "free". */
  cost_per_click_cents: number | null;
  cost_per_request_cents: number | null;
  cost_per_confirmed_cents: number | null;
}

export interface CampaignSummary extends CampaignStats {
  id: string;
  name: string;
  /** Worked out from the dates: scheduled before, active during, ended after. */
  state: 'scheduled' | 'active' | 'ended';
  campaign_type: string | null;
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
  /** The path patients open, e.g. "/r/dr-anderson-sept-3fk". Prefixed with the site's origin on screen. */
  tracking_path: string | null;
}

export interface PulseOverview extends CampaignStats {
  active: CampaignSummary[];
}

export interface AgencyDetail extends AgencySummary {
  campaigns_list: Array<{ id: string; name: string; clicks: number; state: CampaignSummary['state'] }>;
  /** Newest first: added, edited, campaigns started, removed. */
  history: Array<{ kind: string; summary: string | null; occurred_at: string }>;
}

export interface AgencySummary {
  id: string;
  name: string;
  agency_type: string | null;
  status: 'active' | 'inactive';
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
  campaigns: number;
  last_activity_at: string | null;
}

/** Appointment states that count as a confirmed visit for a campaign. */
const CONFIRMED = ['confirmed', 'checked_in', 'completed'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const suffix = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 4);

export const pulseService = {
  /** IA: 9. Pulse Overview > Spend, Clicks, Appointment Requests, Confirmed Appointments, Cost Metrics */
  async getOverview(tx: Tx, ctx: RequestContext, _query: unknown): Promise<PulseOverview> {
    const organizationId = requireOrg(ctx);
    const all = await summaries(tx, organizationId);
    const total = stats(
      sum(all, 'spend_cents'),
      sum(all, 'clicks'),
      sum(all, 'requests'),
      sum(all, 'confirmed'),
    );
    return { ...total, active: all.filter((campaign) => campaign.state === 'active') };
  },

  /** IA: 9. Campaigns > list */
  async listCampaigns(tx: Tx, ctx: RequestContext, _query: unknown): Promise<CampaignSummary[]> {
    return summaries(tx, requireOrg(ctx));
  },

  /**
   * IA: 9. Create Campaign. The campaign promotes the signed-in provider, and
   * gets one tracking link that lands on booking filtered to them.
   */
  async createCampaign(tx: Tx, ctx: RequestContext, input: CreateCampaignValues): Promise<CampaignSummary> {
    const organizationId = requireOrg(ctx);
    const userId = ctx.session!.userId;

    const [provider] = await tx
      .select({ id: providers.id, lastName: providers.lastName, facilityId: providerFacilities.facilityId })
      .from(providers)
      .leftJoin(providerFacilities, eq(providerFacilities.providerId, providers.id))
      .where(and(eq(providers.userId, userId), eq(providers.organizationId, organizationId), isNull(providers.deletedAt)))
      .orderBy(desc(providerFacilities.isPrimary))
      .limit(1);

    // The form's "No agency" is an empty string.
    const agencyId = input.agency_id || null;
    if (agencyId) await assertPartner(tx, organizationId, agencyId, 'agency_id');

    const [created] = await tx
      .insert(campaigns)
      .values({
        organizationId,
        agencyId,
        facilityId: provider?.facilityId ?? null,
        targetProviderId: provider?.id ?? null,
        name: input.name.replace(/\s+/g, ' '),
        campaignType: input.campaign_type,
        description: input.description || null,
        status: 'active',
        totalBudgetCents: budgetToCents(input.budget),
        startsOn: input.starts_on,
        endsOn: input.ends_on,
        createdByUserId: userId,
      })
      .returning();
    if (!created) throw ApiError.internal('Could not create the campaign.');

    // "dr-anderson-september-consult-3fk7": readable in an ad, unique by its suffix.
    // The code holds 24: the doctor gets at most 12, so the campaign keeps a readable share.
    const doctor = slugify(`dr-${provider?.lastName ?? 'practice'}`, 12).replace(/-+$/, '');
    const base = slugify(`${doctor}-${input.name}`, 19).replace(/-+$/, '');
    await tx.insert(campaignTrackingLinks).values({
      organizationId,
      campaignId: created.id,
      code: `${base}-${suffix()}`,
      destinationUrl: provider ? `/book?provider=${provider.id}` : '/book',
      label: 'Main link',
    });

    if (agencyId) {
      await logEngagement(tx, agencyId, organizationId, userId, 'campaign_created', `Campaign "${created.name}" started`);
    }

    await recordAudit(tx, ctx, {
      action: 'pulse.campaign_created',
      resourceType: 'campaign',
      resourceId: created.id,
      organizationId,
      metadata: { campaign_type: input.campaign_type, has_budget: created.totalBudgetCents !== null },
    });

    return (await summaries(tx, organizationId, [created.id]))[0]!;
  },

  /** IA: 9. Campaign Report */
  async getCampaign(tx: Tx, ctx: RequestContext, id: string): Promise<CampaignSummary> {
    const organizationId = requireOrg(ctx);
    if (!UUID.test(id)) throw ApiError.notFound('That campaign was not found.');
    const [found] = await summaries(tx, organizationId, [id]);
    if (!found) throw ApiError.notFound('That campaign was not found.');
    return found;
  },

  async updateCampaign(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('pulseService.updateCampaign');
  },

  /**
   * A tracking link was opened. Public and unauthenticated, so it runs as the
   * system: logs the click, bumps the day's count, and says where to send the
   * visitor. An unknown or retired link answers null and records nothing.
   */
  async recordClick(
    tx: Tx,
    code: string,
    visitor: { visitorId: string | null; referrer: string | null; userAgent: string | null; ipAddress: string | null },
  ): Promise<{ campaignId: string; organizationId: string; destination: string } | null> {
    const [link] = await tx
      .select({
        id: campaignTrackingLinks.id,
        campaignId: campaignTrackingLinks.campaignId,
        organizationId: campaignTrackingLinks.organizationId,
        destination: campaignTrackingLinks.destinationUrl,
        status: campaigns.status,
        timezone: facilities.timezone,
      })
      .from(campaignTrackingLinks)
      .innerJoin(campaigns, eq(campaigns.id, campaignTrackingLinks.campaignId))
      .leftJoin(facilities, eq(facilities.id, campaigns.facilityId))
      .where(and(eq(campaignTrackingLinks.code, code), eq(campaignTrackingLinks.isActive, true), isNull(campaigns.deletedAt)))
      .limit(1);
    if (!link) return null;

    await tx.insert(campaignClicks).values({
      organizationId: link.organizationId,
      campaignId: link.campaignId,
      trackingLinkId: link.id,
      visitorId: visitor.visitorId,
      referrer: visitor.referrer?.slice(0, 2000) ?? null,
      userAgent: visitor.userAgent?.slice(0, 1000) ?? null,
      ipAddress: visitor.ipAddress,
    });

    // The practice's day, so "clicks on the 3rd" means the clinic's 3rd.
    const day = DateTime.now().setZone(link.timezone ?? 'UTC').toISODate()!;
    await tx
      .insert(campaignDailyMetrics)
      .values({ organizationId: link.organizationId, campaignId: link.campaignId, onDate: day, clicks: 1 })
      .onConflictDoUpdate({
        target: [campaignDailyMetrics.campaignId, campaignDailyMetrics.onDate],
        set: { clicks: sql`${campaignDailyMetrics.clicks} + 1`, updatedAt: new Date() },
      });

    return { campaignId: link.campaignId, organizationId: link.organizationId, destination: link.destination };
  },

  /** IA: 9. Agencies > list: the agencies this practice works with. */
  async listAgencies(tx: Tx, ctx: RequestContext): Promise<AgencySummary[]> {
    return agencyRows(tx, requireOrg(ctx));
  },

  /**
   * IA: 9. Add Agency. An agency is platform-wide and only the system may
   * create one, so the agency and this practice's link to it are written
   * together, elevated, and nothing else about it is exposed to the practice.
   */
  async addAgency(tx: Tx, ctx: RequestContext, input: AddAgencyValues): Promise<AgencySummary> {
    const organizationId = requireOrg(ctx);

    const agencyId = await withElevated(tx, async () => {
      const [agency] = await tx
        .insert(agencies)
        .values({
          name: input.name.replace(/\s+/g, ' '),
          slug: `${slugify(input.name, 140)}-${suffix()}`,
          status: 'active',
          agencyType: input.agency_type,
          contactName: input.contact_name,
          contactEmail: input.contact_email.toLowerCase(),
          contactPhone: input.phone ? normalizeUsPhone(input.phone) : null,
          website: normalizeWebsite(input.website),
          notes: input.notes || null,
        })
        .returning({ id: agencies.id });
      if (!agency) throw ApiError.internal('Could not add the agency.');

      await tx.insert(agencyClients).values({
        agencyId: agency.id,
        organizationId,
        status: 'active',
        startedOn: DateTime.now().toISODate()!,
      });
      await tx.insert(agencyEngagements).values({
        agencyId: agency.id,
        organizationId,
        kind: 'added',
        summary: 'Added as a marketing partner',
        actorUserId: ctx.session!.userId,
        occurredAt: new Date(),
      });
      return agency.id;
    });

    await recordAudit(tx, ctx, {
      action: 'pulse.agency_added',
      resourceType: 'agency',
      resourceId: agencyId,
      organizationId,
    });

    const [row] = await agencyRows(tx, organizationId, agencyId);
    if (!row) throw ApiError.internal('Could not add the agency.');
    return row;
  },

  /** IA: 9. Agency Detail > Engagement History */
  async getAgency(tx: Tx, ctx: RequestContext, id: string): Promise<AgencyDetail> {
    const organizationId = requireOrg(ctx);
    if (!UUID.test(id)) throw ApiError.notFound('That agency was not found.');
    const [row] = await agencyRows(tx, organizationId, id);
    if (!row) throw ApiError.notFound('That agency was not found.');

    const linked = await tx
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.organizationId, organizationId), eq(campaigns.agencyId, id), isNull(campaigns.deletedAt)));
    const list = linked.length > 0 ? await summaries(tx, organizationId, linked.map((entry) => entry.id)) : [];

    const history = await tx
      .select({ kind: agencyEngagements.kind, summary: agencyEngagements.summary, occurredAt: agencyEngagements.occurredAt })
      .from(agencyEngagements)
      .where(and(eq(agencyEngagements.agencyId, id), eq(agencyEngagements.organizationId, organizationId)))
      .orderBy(desc(agencyEngagements.occurredAt))
      .limit(50);

    return {
      ...row,
      campaigns_list: list.map((campaign) => ({ id: campaign.id, name: campaign.name, clicks: campaign.clicks, state: campaign.state })),
      history: history.map((entry) => ({ kind: entry.kind, summary: entry.summary, occurred_at: entry.occurredAt.toISOString() })),
    };
  },

  /** IA: 9. Agency Detail > Edit. Only a partner of this practice can be edited from it. */
  async updateAgency(tx: Tx, ctx: RequestContext, id: string, input: AddAgencyValues): Promise<AgencyDetail> {
    const organizationId = requireOrg(ctx);
    if (!UUID.test(id)) throw ApiError.notFound('That agency was not found.');
    await assertPartner(tx, organizationId, id, null, { activeOnly: false });

    await withElevated(tx, () =>
      tx
        .update(agencies)
        .set({
          name: input.name.replace(/\s+/g, ' '),
          agencyType: input.agency_type,
          contactName: input.contact_name,
          contactEmail: input.contact_email.toLowerCase(),
          contactPhone: input.phone ? normalizeUsPhone(input.phone) : null,
          website: normalizeWebsite(input.website),
          notes: input.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(agencies.id, id)),
    );
    await logEngagement(tx, id, organizationId, ctx.session!.userId, 'updated', 'Agency details updated');
    await recordAudit(tx, ctx, { action: 'pulse.agency_updated', resourceType: 'agency', resourceId: id, organizationId });
    return pulseService.getAgency(tx, ctx, id);
  },

  /**
   * IA: 9. Agency Detail > Remove. Ends the partnership rather than deleting
   * it: the agency stays listed as inactive, with its campaign history.
   */
  async removeAgency(tx: Tx, ctx: RequestContext, id: string): Promise<AgencyDetail> {
    const organizationId = requireOrg(ctx);
    if (!UUID.test(id)) throw ApiError.notFound('That agency was not found.');
    await assertPartner(tx, organizationId, id, null, { activeOnly: false });

    const ended = await tx
      .update(agencyClients)
      .set({ status: 'inactive', endedOn: DateTime.now().toISODate()!, updatedAt: new Date() })
      .where(and(eq(agencyClients.agencyId, id), eq(agencyClients.organizationId, organizationId), eq(agencyClients.status, 'active')))
      .returning({ id: agencyClients.id });

    if (ended.length > 0) {
      await logEngagement(tx, id, organizationId, ctx.session!.userId, 'removed', 'Partnership ended');
      await recordAudit(tx, ctx, { action: 'pulse.agency_removed', resourceType: 'agency', resourceId: id, organizationId });
    }
    return pulseService.getAgency(tx, ctx, id);
  },
};

// --- helpers -----------------------------------------------------------------

/** The agency must be linked to this practice -- and, for new work, still an active partner. */
async function assertPartner(
  tx: Tx,
  organizationId: string,
  agencyId: string,
  field: string | null,
  { activeOnly = true }: { activeOnly?: boolean } = {},
): Promise<void> {
  const [link] = await tx
    .select({ status: agencyClients.status })
    .from(agencyClients)
    .where(and(eq(agencyClients.agencyId, agencyId), eq(agencyClients.organizationId, organizationId)))
    .limit(1);
  if (!link) {
    if (field) throw new ApiError('VALIDATION_FAILED', 'Select an agency from the list.', { details: [{ path: field, message: 'Select an agency from the list.' }] });
    throw ApiError.notFound('That agency was not found.');
  }
  if (activeOnly && link.status !== 'active') {
    const message = 'That agency is no longer an active partner.';
    throw new ApiError('VALIDATION_FAILED', message, { details: [{ path: field ?? 'agency_id', message }] });
  }
}

/** Engagement rows are written by the system only (see rls.sql), so this is elevated. */
async function logEngagement(tx: Tx, agencyId: string, organizationId: string, userId: string, kind: string, summary: string) {
  await withElevated(tx, () =>
    // The wall clock, not the default: Postgres's now() is the transaction's start, so
    // two events written in one request would share a timestamp and lose their order.
    tx.insert(agencyEngagements).values({ agencyId, organizationId, kind, summary, actorUserId: userId, occurredAt: new Date() }),
  );
}

function requireOrg(ctx: RequestContext): string {
  if (!ctx.session) throw ApiError.unauthenticated();
  if (!ctx.organizationId) throw ApiError.badRequest('No active organization.');
  return ctx.organizationId;
}

/** The practice's campaigns with their numbers, newest first; `ids` narrows to some. */
async function summaries(tx: Tx, organizationId: string, ids?: string[]): Promise<CampaignSummary[]> {
  const rows = await tx
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.organizationId, organizationId),
        isNull(campaigns.deletedAt),
        ids ? inArray(campaigns.id, ids) : undefined,
      ),
    )
    .orderBy(desc(campaigns.createdAt));
  if (rows.length === 0) return [];
  const campaignIds = rows.map((row) => row.id);

  const [clicks, booked, links] = await Promise.all([
    tx
      .select({ campaignId: campaignDailyMetrics.campaignId, clicks: sql<number>`coalesce(sum(${campaignDailyMetrics.clicks}), 0)::int` })
      .from(campaignDailyMetrics)
      .where(inArray(campaignDailyMetrics.campaignId, campaignIds))
      .groupBy(campaignDailyMetrics.campaignId),
    tx
      .select({
        campaignId: appointments.campaignId,
        requests: sql<number>`count(*)::int`,
        confirmed: sql<number>`count(*) filter (where ${inArray(appointments.status, [...CONFIRMED])})::int`,
      })
      .from(appointments)
      .where(and(inArray(appointments.campaignId, campaignIds), isNull(appointments.deletedAt)))
      .groupBy(appointments.campaignId),
    tx
      .select({ campaignId: campaignTrackingLinks.campaignId, code: campaignTrackingLinks.code })
      .from(campaignTrackingLinks)
      .where(and(inArray(campaignTrackingLinks.campaignId, campaignIds), eq(campaignTrackingLinks.isActive, true))),
  ]);

  const clicksBy = new Map(clicks.map((row) => [row.campaignId, row.clicks]));
  const bookedBy = new Map(booked.map((row) => [row.campaignId, row]));
  const linkBy = new Map(links.map((row) => [row.campaignId, row.code]));

  return rows.map((row) => {
    const counts = bookedBy.get(row.id);
    const code = linkBy.get(row.id);
    return {
      id: row.id,
      name: row.name,
      state: stateOf(row),
      campaign_type: row.campaignType,
      description: row.description,
      starts_on: row.startsOn,
      ends_on: row.endsOn,
      tracking_path: code ? `/r/${code}` : null,
      ...stats(row.totalBudgetCents ?? 0, clicksBy.get(row.id) ?? 0, counts?.requests ?? 0, counts?.confirmed ?? 0),
    };
  });
}

function stats(spend: number, clicks: number, requests: number, confirmed: number): CampaignStats {
  const per = (divisor: number) => (divisor > 0 && spend > 0 ? Math.round(spend / divisor) : null);
  return {
    spend_cents: spend,
    clicks,
    requests,
    confirmed,
    cost_per_click_cents: per(clicks),
    cost_per_request_cents: per(requests),
    cost_per_confirmed_cents: per(confirmed),
  };
}

function sum(list: CampaignStats[], key: 'spend_cents' | 'clicks' | 'requests' | 'confirmed'): number {
  return list.reduce((total, entry) => total + entry[key], 0);
}

/** A paused or archived campaign reads as ended; otherwise the dates decide. */
function stateOf(row: CampaignRow): CampaignSummary['state'] {
  if (row.status !== 'active') return 'ended';
  const today = DateTime.now().toISODate()!;
  if (row.startsOn && row.startsOn > today) return 'scheduled';
  if (row.endsOn && row.endsOn < today) return 'ended';
  return 'active';
}

async function agencyRows(tx: Tx, organizationId: string, id?: string): Promise<AgencySummary[]> {
  const rows = await tx
    .select({
      id: agencies.id,
      name: agencies.name,
      agencyType: agencies.agencyType,
      clientStatus: agencyClients.status,
      contactName: agencies.contactName,
      contactEmail: agencies.contactEmail,
      contactPhone: agencies.contactPhone,
      website: agencies.website,
      notes: agencies.notes,
    })
    .from(agencyClients)
    .innerJoin(agencies, eq(agencies.id, agencyClients.agencyId))
    .where(and(eq(agencyClients.organizationId, organizationId), isNull(agencies.deletedAt), id ? eq(agencies.id, id) : undefined))
    .orderBy(agencies.name);
  if (rows.length === 0) return [];
  const agencyIds = rows.map((row) => row.id);

  const [counts, activity] = await Promise.all([
    tx
      .select({ agencyId: campaigns.agencyId, n: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(and(eq(campaigns.organizationId, organizationId), inArray(campaigns.agencyId, agencyIds), isNull(campaigns.deletedAt)))
      .groupBy(campaigns.agencyId),
    tx
      .select({ agencyId: agencyEngagements.agencyId, last: sql<string>`max(${agencyEngagements.occurredAt})` })
      .from(agencyEngagements)
      .where(and(eq(agencyEngagements.organizationId, organizationId), inArray(agencyEngagements.agencyId, agencyIds)))
      .groupBy(agencyEngagements.agencyId),
  ]);
  const countBy = new Map(counts.map((row) => [row.agencyId, row.n]));
  const lastBy = new Map(activity.map((row) => [row.agencyId, row.last]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    agency_type: row.agencyType,
    status: row.clientStatus === 'active' ? 'active' : 'inactive',
    contact_name: row.contactName,
    contact_email: row.contactEmail,
    contact_phone: row.contactPhone,
    website: row.website,
    notes: row.notes,
    campaigns: countBy.get(row.id) ?? 0,
    last_activity_at: lastBy.get(row.id) ? new Date(lastBy.get(row.id)!).toISOString() : null,
  }));
}
