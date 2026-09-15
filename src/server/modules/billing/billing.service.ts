/**
 * Plans, credits, add-ons, invoices and usage.
 *
 * Stripe holds the money; these tables hold a mirror updated from webhooks. Any
 * read that needs to be correct-to-the-cent should say so and go to Stripe.
 *
 * Credits are an append-only ledger. Never UPDATE a balance -- insert a delta and
 * carry `balanceAfter`, so a disputed charge can be reconstructed line by line.
 *
 * IA: 10. Billing
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const billingService = {
  /** IA: 10. Billing > Billing Overview */
  async getOverview(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('billingService.getOverview');
  },

  /** IA: 10. Billing > Plans, Monthly Annual Toggle */
  async listPlans(tx: Tx, query: unknown): Promise<unknown> {
    return notImplemented('billingService.listPlans');
  },

  /**
   * Returns a Stripe Checkout URL. The subscription row is written by the
   * webhook, not here -- the browser may never come back.
   */
  async startCheckout(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('billingService.startCheckout');
  },

  /** IA: 10. Billing > Payment Method */
  async startPortalSession(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('billingService.startPortalSession');
  },

  async listPaymentMethods(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('billingService.listPaymentMethods');
  },

  /** IA: 10. Billing > Invoices */
  async listInvoices(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('billingService.listInvoices');
  },

  /** Reads the daily rollups. IA: 10. Billing > Usage */
  async getUsage(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('billingService.getUsage');
  },

  /** IA: 10. Billing > Credits */
  async getCredits(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('billingService.getCredits');
  },

  /** IA: 10. Billing > Add-ons, Bundles */
  async listAddons(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('billingService.listAddons');
  },

  /** IA: 10. Add-ons > Buy Once, Auto-Replenish */
  async purchaseAddon(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('billingService.purchaseAddon');
  },

  /**
   * Called by metered actions. Triggers an auto-replenish top-up when the
   * balance crosses the configured threshold.
   */
  async consumeCredits(tx: Tx, input: unknown): Promise<unknown> {
    return notImplemented('billingService.consumeCredits');
  },
};
