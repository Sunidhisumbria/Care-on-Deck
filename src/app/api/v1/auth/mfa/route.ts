/**
 * auth/mfa
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { authService } from '@/server/modules/auth/auth.service';

/** IA: 12. Settings > MFA */
export const GET = defineRoute({
  access: 'user',
  handler: async ({ tx, ctx }) =>
    ok(await authService.listMfaFactors(tx, ctx)),
});

/** Begins MFA enrolment. */
export const POST = defineRoute({
  access: 'user',
  handler: async ({ tx, ctx, body }) =>
    ok(await authService.enrollMfa(tx, ctx, body)),
});
