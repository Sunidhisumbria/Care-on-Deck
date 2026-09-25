/**
 * In-app notifications and the outbound mail and SMS behind them.
 *
 * Delivery is decided per recipient by category and channel preference, then
 * checked against the suppression list. A send that is skipped for suppression is
 * still recorded, so "why did they not get it" has an answer.
 *
 * IA: 11. Notifications
 */
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';

import type { RequestContext } from '@/server/auth/context';
import { notifications } from '@/server/db/schema/notifications';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { notImplemented } from '@/server/http/response';

export interface NotificationItem {
  id: string;
  category: string;
  /** Finer than category, for the icon: new_request, rescheduled, cancelled, confirmed, no_show... */
  kind: string | null;
  title: string;
  body: string | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
}

/** Mark some read by id, or all of them. */
export const markReadSchema = z.union([
  z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).strict(),
  z.object({ all: z.literal(true) }).strict(),
]);
export type MarkReadInput = z.infer<typeof markReadSchema>;

export const notificationService = {
  /** IA: 11. Notifications > Notification List */
  async list(tx: Tx, ctx: RequestContext, _query: unknown): Promise<{ items: NotificationItem[]; unread: number }> {
    const userId = requireUser(ctx);
    const rows = await tx
      .select()
      .from(notifications)
      .where(and(eq(notifications.recipientUserId, userId), isNull(notifications.deletedAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    const unread = await tx
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.recipientUserId, userId), isNull(notifications.readAt), isNull(notifications.deletedAt)));
    return {
      unread: unread.length,
      items: rows.map((row) => ({
        id: row.id,
        category: row.category,
        kind: typeof row.data?.kind === 'string' ? row.data.kind : null,
        title: row.title,
        body: row.body,
        action_url: row.actionUrl,
        read: row.readAt !== null,
        created_at: row.createdAt.toISOString(),
      })),
    };
  },

  /** IA: 11. Notifications > Notification Detail */
  async get(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('notificationService.get');
  },

  /** Clear all: removed from the list, kept on record (soft-deleted), as every notification row is. */
  async clearAll(tx: Tx, ctx: RequestContext): Promise<{ cleared: number }> {
    const userId = requireUser(ctx);
    const cleared = await tx
      .update(notifications)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notifications.recipientUserId, userId), isNull(notifications.deletedAt)))
      .returning({ id: notifications.id });
    return { cleared: cleared.length };
  },

  async markRead(tx: Tx, ctx: RequestContext, input: MarkReadInput): Promise<{ updated: number }> {
    const userId = requireUser(ctx);
    const updated = await tx
      .update(notifications)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          isNull(notifications.readAt),
          isNull(notifications.deletedAt),
          'ids' in input ? inArray(notifications.id, input.ids) : undefined,
        ),
      )
      .returning({ id: notifications.id });
    return { updated: updated.length };
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

function requireUser(ctx: RequestContext): string {
  const userId = ctx.session?.userId;
  if (!userId) throw ApiError.unauthenticated();
  return userId;
}
