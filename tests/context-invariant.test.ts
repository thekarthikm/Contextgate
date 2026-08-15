import { describe, expect, it } from 'vitest';

import { InvariantViolationError, buildContext } from '@/server/context';
import { allChunks } from '@/server/corpus';
import { CEDAR_CANARY, maya } from './helpers';

/**
 * The context builder is the second, independent enforcement point. These tests
 * simulate a hypothetical retrieval bug to prove that the invariant is actually
 * checked rather than merely documented.
 */
describe('context builder invariant', () => {
  const cedarChunk = allChunks().find((chunk) => chunk.text.includes(CEDAR_CANARY))!;

  it('aborts when an unauthorized chunk reaches it', () => {
    expect(() =>
      buildContext(maya, [{ chunk: cedarChunk, score: 1 }])
    ).toThrowError(InvariantViolationError);
  });

  it('names the offending chunk so the bug is findable', () => {
    try {
      buildContext(maya, [{ chunk: cedarChunk, score: 1 }]);
      expect.unreachable('buildContext should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(InvariantViolationError);
      expect((error as InvariantViolationError).offendingChunkIds).toEqual([
        cedarChunk.id,
      ]);
    }
  });

  it('does not silently drop the unauthorized chunk and continue', () => {
    const authorized = allChunks().filter(
      (chunk) => chunk.documentId === 'deployment-playbook'
    );

    // A "helpful" implementation would return the one safe chunk. That would
    // hide the retrieval bug that produced the unsafe one.
    expect(() =>
      buildContext(maya, [
        { chunk: authorized[0], score: 1 },
        { chunk: cedarChunk, score: 0.9 },
      ])
    ).toThrowError(InvariantViolationError);
  });

  it('builds a context for authorized chunks and re-verifies every one', () => {
    const authorized = allChunks().filter(
      (chunk) => chunk.documentId === 'deployment-playbook'
    );
    const context = buildContext(
      maya,
      authorized.map((chunk) => ({ chunk, score: 1 }))
    );

    expect(context.verifiedCount).toBe(authorized.length);
    expect(context.chunks).toHaveLength(authorized.length);
    expect(context.text).toContain('CLASSIFICATION: INTERNAL');
    expect(context.text).not.toContain(CEDAR_CANARY);
  });

  it('produces an explicitly empty context rather than omitting the section', () => {
    const context = buildContext(maya, []);
    expect(context.chunks).toHaveLength(0);
    expect(context.text).toContain('no authorized context matched this request');
  });
});
