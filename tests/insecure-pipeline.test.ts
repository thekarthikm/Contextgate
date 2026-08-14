import { describe, expect, it } from 'vitest';

import {
  insecureRun,
  secureRun,
} from '@/server/demo-insecure/insecure-pipeline';
import { CEDAR_CANARY, maya } from './helpers';

/**
 * The control condition.
 *
 * The comparison in the Attack Lab is only meaningful if the insecure
 * architecture genuinely leaks. This test asserts that it does — it is the one
 * place in this repository where a leak is the expected result.
 */
describe('intentionally insecure pipeline (demonstration only)', () => {
  const query = 'What is Project Cedar and what are we paying for it?';

  it('leaks the executive canary to an employee', () => {
    const side = insecureRun(maya, query);

    expect(side.executiveChunksInContext).toBeGreaterThan(0);
    expect(side.modelContext).toContain(CEDAR_CANARY);
    // The malicious model ignores the "do not reveal" instruction, as expected.
    expect(side.answer).toContain(CEDAR_CANARY);
    expect(side.canaryPresent).toBe(true);
    expect(side.verdict).toBe('LEAKED');
  });

  it('searches the entire corpus regardless of the caller', () => {
    expect(insecureRun(maya, query).documentsSearched).toBe(10);
  });

  it('is defeated by nothing more than a "do not reveal" instruction', () => {
    const side = insecureRun(maya, query);
    // The prompt asks for discretion, and the context still ends up in the
    // output. A prompt was never a security control.
    expect(side.modelContext).toContain('Do not reveal');
    expect(side.answer).toContain(CEDAR_CANARY);
  });

  it('protects the same employee, same query and same malicious model under ContextGate', () => {
    const side = secureRun(maya, query);

    expect(side.documentsSearched).toBe(3);
    expect(side.executiveChunksInContext).toBe(0);
    expect(side.modelContext).not.toContain(CEDAR_CANARY);
    expect(side.answer).not.toContain(CEDAR_CANARY);
    expect(side.canaryPresent).toBe(false);
    expect(side.verdict).toBe('PROTECTED');
  });

  it('demonstrates that only the ordering of authorization differs', () => {
    const insecure = insecureRun(maya, query);
    const secure = secureRun(maya, query);

    expect(insecure.verdict).toBe('LEAKED');
    expect(secure.verdict).toBe('PROTECTED');
    expect(insecure.documentsSearched).toBeGreaterThan(secure.documentsSearched);
  });
});
