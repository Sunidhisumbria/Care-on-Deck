/**
 * auth/contact
 *
 * Change the email or phone you sign in with, step one: a code is sent to the
 * new address. Refused when another account already uses it.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { changeContactSchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const POST = defineRoute({
  access: 'account',
  body: changeContactSchema,
  handler: async ({ tx, ctx, body }) => ok(await authService.requestContactChange(tx, ctx, body)),
});
