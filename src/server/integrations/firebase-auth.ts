import { env } from '@/server/config/env';
import { IntegrationNotConfiguredError } from '@/server/http/errors';

import type { Adapter } from './types';

/**
 * IA: 15. External Services > Authentication (Firebase Auth, Google OAuth, Apple OAuth).
 *
 * Firebase owns credentials and federated sign-in; we own the session (see
 * src/server/auth/session.ts). The only thing we ask Firebase is: is this ID
 * token genuine, and whose is it. Everything after that is ours, which is what
 * makes instant revocation from Control Center possible.
 */
export interface FirebaseTokenClaims {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  /** password | google.com | apple.com | phone */
  signInProvider: string;
}

export interface FirebaseAuthAdapter extends Adapter {
  verifyIdToken(idToken: string): Promise<FirebaseTokenClaims>;
  /** Used by Control Center to lock an account platform-wide. */
  setDisabled(uid: string, disabled: boolean): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
}

export const firebaseAuth: FirebaseAuthAdapter = {
  vendor: 'firebase_auth',
  meter: null,

  isConfigured() {
    return Boolean(
      env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY,
    );
  },

  async verifyIdToken() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Firebase Auth');
    // TODO: getAuth(app).verifyIdToken(idToken, true).
    // checkRevoked must be true, otherwise a token revoked in Firebase stays
    // usable for the remainder of its hour-long life.
    throw new Error('firebaseAuth.verifyIdToken is not implemented yet.');
  },

  async setDisabled() {
    throw new Error('firebaseAuth.setDisabled is not implemented yet.');
  },

  async revokeRefreshTokens() {
    throw new Error('firebaseAuth.revokeRefreshTokens is not implemented yet.');
  },
};
