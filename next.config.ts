import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sensitive demonstration data lives in src/server/** and must never be
  // reachable from a client component. Anything importing src/server/corpus.ts
  // from the client boundary will fail the build via the `server-only` guard.
  poweredByHeader: false,
};

export default nextConfig;
