/**
 * practice/profile
 *
 * IA: 6. Account Menu > Personal Information. The signed-in provider's own
 * profile inside their active practice.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { updateProviderPhotoSchema } from '@/server/modules/practice/profile.schemas';
import { providerProfileService } from '@/server/modules/practice/profile.service';

export const GET = defineRoute({
  access: 'user',
  handler: async ({ tx, ctx }) => ok(await providerProfileService.getOwn(tx, ctx)),
});

/** Personal details: the photo. Name, email and phone change elsewhere -- see the service. */
export const PATCH = defineRoute({
  access: 'user',
  body: updateProviderPhotoSchema,
  handler: async ({ tx, ctx, body }) => ok(await providerProfileService.updatePhoto(tx, ctx, body)),
});
