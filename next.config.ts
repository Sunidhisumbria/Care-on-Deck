import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /*
   * `next build` and `next dev` both write here, so a build run while the dev
   * server is up overwrites what dev is serving and every route starts
   * answering 500 until dev is restarted. `npm run build:check` sets this to a
   * scratch directory so a build can be run any time without that.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  // Moved out of `experimental` in Next 15.5; it warns on boot otherwise.
  typedRoutes: true,
  // Node-only SDKs must never be bundled into the edge/client graph.
  serverExternalPackages: ['postgres', 'firebase-admin', 'pino'],
  async headers() {
    return [
      {
        // PHI must never sit in a shared cache.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
