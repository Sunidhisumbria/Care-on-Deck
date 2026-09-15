/**
 * An office's own booking page and website embed.
 *
 * Direct traffic carries no marketplace lead fee, so attribution matters: a
 * booking that arrives through a Direct page must be recorded as `direct`, not
 * folded into marketplace numbers.
 *
 * IA: 8. Direct
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const directService = {
  async listPages(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('directService.listPages');
  },

  /** IA: 8. Direct > Private Booking Page, Private URL */
  async createPage(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('directService.createPage');
  },

  async getPage(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('directService.getPage');
  },

  /** IA: 8. Direct Settings > Branding, Add-ons, Auto-Replenish */
  async updatePage(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('directService.updatePage');
  },

  /** The unauthenticated page itself. Serves only published pages. */
  async getPublicPage(tx: Tx, slug: string, query: unknown): Promise<unknown> {
    return notImplemented('directService.getPublicPage');
  },

  /**
   * IA: 8. Website Install > Booking Button, Copy Link, Embed Code,
   * Install Status
   */
  async getInstall(tx: Tx, ctx: RequestContext, pageId: string): Promise<unknown> {
    return notImplemented('directService.getInstall');
  },

  /** IA: 8. Website Install > Done For You Setup */
  async requestDoneForYou(tx: Tx, ctx: RequestContext, pageId: string): Promise<unknown> {
    return notImplemented('directService.requestDoneForYou');
  },

  /**
   * Called by the widget itself; flips install status from code_copied to
   * detected the first time the snippet actually runs on the site.
   */
  async recordEmbedSeen(tx: Tx, embedKey: string, origin: string): Promise<unknown> {
    return notImplemented('directService.recordEmbedSeen');
  },
};
