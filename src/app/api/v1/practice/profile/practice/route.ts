/** practice/profile/practice -- Personal Information > Practice Details > Edit. */
import { practiceSchema } from '@/lib/practice';
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { updatePractice } from '@/server/modules/practice/profile-edits';
import { providerProfileService } from '@/server/modules/practice/profile.service';

export const PUT = defineRoute({
  access: 'user',
  body: practiceSchema,
  handler: async ({ tx, ctx, body }) => {
    await updatePractice(tx, ctx, body);
    return ok(await providerProfileService.getOwn(tx, ctx));
  },
});
