/**
 * POST /api/v1/auth/social
 *
 * "Continue with Google" and "Continue with Apple". One endpoint; the provider
 * comes from `social_type` in the body.
 *
 * The client completes the provider handshake and sends the resulting ID token
 * in the `x-provider-token` header -- it is a credential, so it does not go in
 * the body. Only that token is trusted: `social_id` and `email` are checked
 * against it and the request is rejected if they disagree.
 *
 * IA: 15. External Services > Authentication > Google OAuth / Apple OAuth
 */
import { signedIn } from '@/server/auth/session';
import { defineRoute } from '@/server/http/handler';
import { TOKEN_HEADERS, requireTokenHeader } from '@/server/http/headers';
import { ok } from '@/server/http/response';
import { socialSignInBodySchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const POST = defineRoute({
  access: 'public',
  body: socialSignInBodySchema,
  handler: async ({ tx, ctx, body, request }) => {
    const token = requireTokenHeader(request, TOKEN_HEADERS.provider, 'The sign-in token');

    const result = await authService.socialSignIn(tx, ctx, { ...body, token });
    return signedIn((payload) => ok(payload), result.body, result.session);
  },
});
