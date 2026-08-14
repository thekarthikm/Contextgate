/**
 * Test-time stub for `import 'server-only'`.
 *
 * Next.js resolves the real `server-only` marker at compile time, which is what
 * makes importing src/server/** from a client component a build error. Vitest
 * runs outside that pipeline, so the marker is aliased to this empty module.
 * The guarantee itself is verified by tests/client-bundle.test.ts, which scans
 * the actual production client assets.
 */
export {};
