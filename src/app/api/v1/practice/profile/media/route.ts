/** practice/profile/media -- Personal Information > Profile & Media > Edit. The photo saves on its own. */
import { profileSchema } from '@/lib/profile';
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { updateMedia } from '@/server/modules/practice/profile-edits';
import { providerProfileService } from '@/server/modules/practice/profile.service';

export const PUT = defineRoute({
  access: 'user',
  body: profileSchema,
  handler: async ({ tx, ctx, body }) => {
    await updateMedia(tx, ctx, body);
    return ok(await providerProfileService.getOwn(tx, ctx));
  },
});
