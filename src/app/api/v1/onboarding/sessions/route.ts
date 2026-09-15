/**
 * onboarding/sessions
 *
 *   GET  -- the signed-in provider's application, or `session: null`.
 *   POST -- start one. Idempotent: returns the existing application if there is
 *           one, so a double-click or a retry cannot create two.
 *
 * `access: 'account'` rather than 'user': a provider mid-application has no
 * organization yet -- it is created at submission -- and 'user' requires one.
 * RLS on `onboarding_sessions` scopes every read to the applicant.
 *
 * IA: 4. Provider Onboarding / 5. Office Onboarding
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { startOnboardingSchema } from '@/server/modules/onboarding/onboarding.schemas';
import { onboardingService } from '@/server/modules/onboarding/onboarding.service';

export const GET = defineRoute({
  access: 'account',
  handler: async ({ tx, ctx }) => ok({ session: await onboardingService.getCurrent(tx, ctx) }),
});

export const POST = defineRoute({
  access: 'account',
  body: startOnboardingSchema,
  handler: async ({ tx, ctx, body }) => ok(await onboardingService.start(tx, ctx, body)),
});
