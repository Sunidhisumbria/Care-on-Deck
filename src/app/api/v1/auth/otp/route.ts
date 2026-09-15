/**
 * POST /api/v1/auth/otp
 *
 * Sends a one-time code by SMS or email. Open to anonymous traffic (signup,
 * password reset, passwordless login) and to signed-in users confirming their
 * own contact details. Rate-limited per destination and per IP in the service.
 *
 * IA: 4/5. Onboarding > Verify Mobile
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { sendOtpSchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const POST = defineRoute({
  access: 'optional',
  body: sendOtpSchema,
  handler: async ({ tx, ctx, body }) => ok(await authService.sendOtp(tx, ctx, body)),
});
