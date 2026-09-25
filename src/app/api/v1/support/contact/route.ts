/** support/contact -- the account menu's Contact Us, for patients and practices alike. */
import { contactSchema } from '@/lib/support';
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { supportService } from '@/server/modules/support/support.service';

export const POST = defineRoute({
  access: 'account',
  body: contactSchema,
  handler: async ({ tx, ctx, body }) => ok(await supportService.contact(tx, ctx, body)),
});
