/**
 * In-app notifications and the outbound mail and SMS behind them.
 *
 * Delivery is decided per recipient by category and channel preference, then
 * checked against the suppression list. A send that is skipped for suppression is
 * still recorded, so "why did they not get it" has an answer.
 *
 * IA: 11. Notifications
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const notificationService = {
  /** IA: 11. Notifications > Notification List */
  async list(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('notificationService.list');
  },

  /** IA: 11. Notifications > Notification Detail */
  async get(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('notificationService.get');
  },

  async markRead(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('notificationService.markRead');
  },

  async getPreferences(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('notificationService.getPreferences');
  },

  async updatePreferences(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('notificationService.updatePreferences');
  },

  /**
   * The one entry point for raising a notification. Writes the in-app row,
   * fans out to the enabled channels, and meters each send.
   */
  async dispatch(tx: Tx, input: unknown): Promise<unknown> {
    return notImplemented('notificationService.dispatch');
  },
};
