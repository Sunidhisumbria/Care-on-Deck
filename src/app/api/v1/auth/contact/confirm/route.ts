/**
 * auth/contact/confirm
 *
 * Change the email or phone you sign in with, step two: the code proves the
 * new address is yours, and the account switches to it.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { confirmContactChangeSchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const POST = defineRoute({
  access: 'account',
  body: confirmContactChangeSchema,
  handler: async ({ tx, ctx, body }) => ok(await authService.confirmContactChange(tx, ctx, body)),
});
