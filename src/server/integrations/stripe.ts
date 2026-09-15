import { env } from '@/server/config/env';
import { IntegrationNotConfiguredError } from '@/server/http/errors';

import type { Adapter } from './types';

/**
 * IA: 15. External Services > Payments > Stripe; 10. Billing.
 *
 * Stripe is the source of truth for money; our tables mirror it. The mirror is
 * updated from webhooks rather than from the API response to our own request --
 * that way a checkout completed in a tab we never hear back from still lands.
 */
export interface StripeAdapter extends Adapter {
  ensureCustomer(input: {
    organizationId: string;
    name: string;
    email?: string;
  }): Promise<string>;

  createCheckoutSession(input: {
    customerId: string;
    priceId: string;
    quantity?: number;
    successUrl: string;
    cancelUrl: string;
    mode: 'subscription' | 'payment';
  }): Promise<{ id: string; url: string }>;

  createBillingPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  /**
   * Charges a saved card without the customer present, for an auto-replenish
   * top-up. IA: 10. Billing > Add-ons > Auto-Replenish.
   * `idempotencyKey` is mandatory -- a retried top-up must not double-charge.
   */
  chargeOffSession(input: {
    customerId: string;
    paymentMethodId: string;
    amountCents: number;
    description: string;
    idempotencyKey: string;
  }): Promise<{ id: string; status: string }>;

  /** Throws unless the signature matches STRIPE_WEBHOOK_SECRET. */
  constructWebhookEvent(
    rawBody: string,
    signature: string,
  ): Promise<{ id: string; type: string; data: unknown }>;
}

export const stripe: StripeAdapter = {
  vendor: 'stripe',
  meter: 'stripe',

  isConfigured() {
    return Boolean(env.STRIPE_SECRET_KEY);
  },

  async ensureCustomer() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Stripe');
    throw new Error('stripe.ensureCustomer is not implemented yet.');
  },

  async createCheckoutSession() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Stripe');
    throw new Error('stripe.createCheckoutSession is not implemented yet.');
  },

  async createBillingPortalSession() {
    throw new Error('stripe.createBillingPortalSession is not implemented yet.');
  },

  async chargeOffSession() {
    throw new Error('stripe.chargeOffSession is not implemented yet.');
  },

  async constructWebhookEvent() {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new IntegrationNotConfiguredError('Stripe webhooks');
    throw new Error('stripe.constructWebhookEvent is not implemented yet.');
  },
};
