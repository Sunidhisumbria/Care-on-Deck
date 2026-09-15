/**
 * Configuration the browser is allowed to see.
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time by substituting the literal
 * text `process.env.NEXT_PUBLIC_X`. That is a find-and-replace, not a lookup:
 * `process.env[name]` or destructuring never gets substituted and is
 * `undefined` in the browser. So each one is written out in full, once, here
 * -- and every client component reads it from this file rather than touching
 * `process.env` itself.
 *
 * Nothing secret belongs in this file. These are publishable keys, restricted
 * by referrer or origin in their own consoles.
 */

export const publicEnv = {
  /** Absolute base URL. Only needed where a relative path will not do -- an
   *  OAuth redirect_uri, a share link, a QR code. API calls stay relative. */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',

  googleMapsBrowserKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',

  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '',
  },
} as const;

/** True once the Firebase web config is filled in. */
export function isFirebaseConfigured(): boolean {
  const { apiKey, authDomain, projectId, appId } = publicEnv.firebase;
  return Boolean(apiKey && authDomain && projectId && appId);
}
