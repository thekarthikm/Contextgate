import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { EXECUTIVE_CANARY_TOKENS } from './helpers';

const ROOT = resolve(__dirname, '..');
const NEXT_DIR = join(ROOT, '.next');

/**
 * The rule this file enforces: executive data must never be imported into a
 * client component, and therefore must never appear in anything the browser
 * downloads.
 *
 * Two layers of check:
 *   1. Source-level — nothing under src/app or src/components may name a canary
 *      or import the server corpus. Fast, and catches the mistake at the moment
 *      it is made.
 *   2. Artifact-level — scan the real production client assets. This is the
 *      check that cannot be fooled by a clever indirection.
 */

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const SECRETS = [...EXECUTIVE_CANARY_TOKENS, '$187,430,921'] as const;

describe('executive canaries are absent from client-side code', () => {
  it('is not referenced by any client-reachable source file', () => {
    const sources = [
      ...walk(join(ROOT, 'src', 'app')),
      ...walk(join(ROOT, 'src', 'components')),
      ...walk(join(ROOT, 'src', 'lib')),
    ].filter((path) => /\.(ts|tsx|css)$/.test(path));

    expect(sources.length).toBeGreaterThan(10);

    for (const path of sources) {
      // src/app/api/** is server-only route code, but it must still not inline
      // a canary literal — it should read it from the server modules.
      const contents = readFileSync(path, 'utf8');
      for (const secret of SECRETS) {
        expect(
          contents.includes(secret),
          `${relative(ROOT, path)} references the secret "${secret}"`
        ).toBe(false);
      }
    }
  });

  it('is not imported into any client component', () => {
    const clientFiles = walk(join(ROOT, 'src', 'components')).filter((path) =>
      /\.tsx?$/.test(path)
    );

    for (const path of clientFiles) {
      const contents = readFileSync(path, 'utf8');
      expect(
        /from\s+['"]@\/server\//.test(contents),
        `${relative(ROOT, path)} imports from @/server/**`
      ).toBe(false);
    }
  });
});

describe('executive canaries are absent from client bundles', () => {
  it('does not appear in any production client asset', () => {
    if (!existsSync(join(NEXT_DIR, 'static'))) {
      // Build on demand so this test is meaningful when run standalone.
      execFileSync('npm', ['run', 'build'], {
        cwd: ROOT,
        stdio: 'ignore',
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
      });
    }

    const clientAssets = [
      // Everything served from /_next/static — JS chunks, CSS, media.
      ...walk(join(NEXT_DIR, 'static')),
      // Prerendered HTML and RSC flight payloads delivered to the browser.
      ...walk(join(NEXT_DIR, 'server', 'app')).filter((path) =>
        /\.(html|rsc|meta)$/.test(path)
      ),
    ];

    expect(
      clientAssets.length,
      'no client assets found — did the production build run?'
    ).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const path of clientAssets) {
      const contents = readFileSync(path, 'utf8');
      for (const secret of SECRETS) {
        if (contents.includes(secret)) {
          offenders.push(`${relative(ROOT, path)} → ${secret}`);
        }
      }
    }

    expect(offenders, 'executive data was bundled into client assets').toEqual([]);
  }, 600_000);

  it('does not ship the enterprise corpus text to the browser', () => {
    const clientAssets = walk(join(NEXT_DIR, 'static')).filter((path) =>
      path.endsWith('.js')
    );

    // Sentences that exist only inside server-side documents.
    const serverOnlyProse = [
      'Cedar Dynamics',
      'consolidates seven business units',
      'Production deployment requires a green CI pipeline',
      'Halcyon Freight',
    ];

    for (const path of clientAssets) {
      const contents = readFileSync(path, 'utf8');
      for (const prose of serverOnlyProse) {
        expect(
          contents.includes(prose),
          `${relative(ROOT, path)} contains server-only prose "${prose}"`
        ).toBe(false);
      }
    }
  });
});
