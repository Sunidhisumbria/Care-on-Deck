/**
 * Paid acquisition: campaigns, agencies and the numbers behind them.
 *
 * Reads come from `campaign_daily_metrics`, never from a live scan of
 * `campaign_clicks` -- the raw click stream is retained briefly and is far too
 * large to aggregate on a dashboard load.
 *
 * IA: 9. Pulse
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const pulseService = {
  /**
   * IA: 9. Pulse Overview > Spend, Clicks, Appointment Requests,
   * Confirmed Appointments, Cost Metrics
   */
  async getOverview(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('pulseService.getOverview');
  },

  async listCampaigns(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('pulseService.listCampaigns');
  },

  /** IA: 9. Campaigns > Create Campaign, Tracking Link */
  async createCampaign(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('pulseService.createCampaign');
  },

  /** IA: 9. Campaigns > Campaign Report */
  async getCampaign(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('pulseService.getCampaign');
  },

  async updateCampaign(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('pulseService.updateCampaign');
  },

  /**
   * Tracking-link redirect. Truncates the IP before storing it -- we need
   * geography, not identity.
   */
  async recordClick(tx: Tx, code: string, visitor: unknown): Promise<unknown> {
    return notImplemented('pulseService.recordClick');
  },

  /** IA: 9. Agencies > Agency List */
  async listAgencies(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('pulseService.listAgencies');
  },

  /** IA: 9. Agencies > Add Agency */
  async addAgency(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('pulseService.addAgency');
  },

  /** IA: 9. Agencies > Agency Detail, Engagement History */
  async getAgency(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('pulseService.getAgency');
  },
};
