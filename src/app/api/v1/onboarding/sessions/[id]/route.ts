/**
 * onboarding/sessions/[id]
 *
 *   GET   -- one application, the caller's own only.
 *   PATCH -- save one step: `{ step, data }`. The server validates the step's
 *            answers, refuses steps out of order, and returns the whole updated
 *            application -- including anything cleared because an earlier answer
 *            changed.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { saveStepSchema } from '@/server/modules/onboarding/onboarding.schemas';
import { onboardingService } from '@/server/modules/onboarding/onboarding.service';

export const GET = defineRoute<{ id: string }>({
  access: 'account',
  handler: async ({ tx, ctx, params }) => ok(await onboardingService.get(tx, ctx, params.id)),
});

/** Persists one step so the flow survives a refresh or a device change. */
export const PATCH = defineRoute<{ id: string }>({
  access: 'account',
  body: saveStepSchema,
  handler: async ({ tx, ctx, body, params }) =>
    ok(await onboardingService.saveStep(tx, ctx, params.id, body)),
});
