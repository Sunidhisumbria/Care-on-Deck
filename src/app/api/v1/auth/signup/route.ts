/**
 * POST /api/v1/auth/signup
 *
 * Creates a patient account. Staff and provider accounts come through
 * onboarding, not here.
 *
 * Deliberately returns no tokens: nothing has yet proved the person holds the
 * mobile number they gave. `next_step` sends the client to code entry, and
 * verifying that code is what issues the session.
 *
 * IA: 2. Patient Booking > Almost There > Account Creation
 */
import { defineRoute } from '@/server/http/handler';
import { created } from '@/server/http/response';
import { signupSchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const POST = defineRoute({
  access: 'public',
  body: signupSchema,
  handler: async ({ tx, ctx, body }) => {
    const result = await authService.signup(tx, ctx, body);
    return created(result.body);
  },
});
