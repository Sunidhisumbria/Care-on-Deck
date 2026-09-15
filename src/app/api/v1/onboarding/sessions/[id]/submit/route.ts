/**
 * onboarding/sessions/[id]/submit
 *
 * IA: 4/5. Onboarding > Submit for Review. Turns the application into records
 * and opens an approval request. Owner-only, like every onboarding endpoint.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { submitApplicationSchema } from '@/server/modules/onboarding/onboarding.schemas';
import { onboardingService } from '@/server/modules/onboarding/onboarding.service';

export const POST = defineRoute<{ id: string }>({
  access: 'account',
  body: submitApplicationSchema,
  handler: async ({ tx, ctx, params, body }) =>
    ok(await onboardingService.submitForReview(tx, ctx, params.id, body)),
});
