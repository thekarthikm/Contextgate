import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/**
 * The intentionally insecure pipeline is a demonstration prop. These tests keep
 * it quarantined: if someone ever wires it into the real query path, this fails.
 */
describe('insecure demo pipeline is quarantined', () => {
  // Matches a real module specifier, not a mention of the path in a comment.
  const insecureImport = /(?:from|import|require)\s*\(?\s*['"][^'"]*demo-insecure/;

  it('is not imported by the real query route', () => {
    const contents = readFileSync(
      join(ROOT, 'src', 'app', 'api', 'query', 'route.ts'),
      'utf8'
    );
    expect(insecureImport.test(contents)).toBe(false);
  });

  it('is not imported by the secure pipeline or any of its dependencies', () => {
    const secureModules = walk(join(ROOT, 'src', 'server')).filter(
      (path) => path.endsWith('.ts') && !path.includes('demo-insecure')
    );

    expect(secureModules.length).toBeGreaterThan(5);

    for (const path of secureModules) {
      const contents = readFileSync(path, 'utf8');
      expect(
        insecureImport.test(contents),
        `${relative(ROOT, path)} imports the insecure pipeline`
      ).toBe(false);
    }
  });

  it('is reachable only from the comparison route', () => {
    const routes = walk(join(ROOT, 'src', 'app', 'api')).filter((path) =>
      path.endsWith('.ts')
    );

    const importers = routes.filter((path) =>
      insecureImport.test(readFileSync(path, 'utf8'))
    );

    expect(importers.map((path) => relative(ROOT, path).replace(/\\/g, '/'))).toEqual([
      'src/app/api/attack/compare/route.ts',
    ]);
  });

  it('is not imported by any client component', () => {
    const components = walk(join(ROOT, 'src', 'components')).filter((path) =>
      /\.tsx?$/.test(path)
    );

    for (const path of components) {
      expect(
        insecureImport.test(readFileSync(path, 'utf8')),
        `${relative(ROOT, path)} imports the insecure pipeline`
      ).toBe(false);
    }
  });

  it('carries the mandatory warning banner', () => {
    const contents = readFileSync(
      join(ROOT, 'src', 'server', 'demo-insecure', 'insecure-pipeline.ts'),
      'utf8'
    );
    expect(contents).toContain('INTENTIONALLY INSECURE');
    expect(contents).toContain('DEMONSTRATION ONLY');
    expect(contents).toContain('DO NOT USE FOR PRODUCTION RETRIEVAL');
  });
});

describe('server-only modules are marked', () => {
  it("every src/server module declares 'server-only'", () => {
    const modules = walk(join(ROOT, 'src', 'server')).filter((path) =>
      path.endsWith('.ts')
    );

    for (const path of modules) {
      expect(
        readFileSync(path, 'utf8').includes("import 'server-only'"),
        `${relative(ROOT, path)} is missing the server-only marker`
      ).toBe(true);
    }
  });
});
