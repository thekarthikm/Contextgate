import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sensitive demonstration data lives in src/server/** and must never be
  // reachable from a client component. Anything importing src/server/corpus.ts
  // from the client boundary will fail the build via the `server-only` guard.
  poweredByHeader: false,
  // Development only. `next dev` blocks cross-origin requests for its own
  // static chunks by default, which breaks the app when it is viewed through a
  // local proxy or preview pane on a different host than the dev server (the
  // bundle never loads, so React never hydrates). Has no effect on `next build`
  // or on the deployed application.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.0.45'],
};

export default nextConfig;
