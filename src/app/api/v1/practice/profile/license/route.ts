/** practice/profile/license -- Personal Information > Documents License > Edit. Goes back to review. */
import { licenseSchema } from '@/lib/license';
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { updateLicense } from '@/server/modules/practice/profile-edits';
import { providerProfileService } from '@/server/modules/practice/profile.service';

export const PUT = defineRoute({
  access: 'user',
  body: licenseSchema,
  handler: async ({ tx, ctx, body }) => {
    await updateLicense(tx, ctx, body);
    return ok(await providerProfileService.getOwn(tx, ctx));
  },
});
