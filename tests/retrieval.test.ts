import { describe, expect, it } from 'vitest';

import { evaluatePolicy } from '@/server/authz';
import { allChunks } from '@/server/corpus';
import { runSecureQuery } from '@/server/pipeline';
import { secureRetrieve } from '@/server/retrieval';
import { CEDAR_CANARY, ORION_CANARY, elena, marcus, maya } from './helpers';

/**
 * Exhaustive check of the retrieval boundary: for every identity, and for a
 * query built from the text of every chunk in the corpus (including chunks the
 * identity cannot read), retrieval must return nothing unauthorized.
 *
 * Querying with the exact words of a secret document is the strongest available
 * relevance signal — if a filter-after-retrieval bug existed, this would find it.
 */
describe('secure retrieval boundary', () => {
  it('never returns an unauthorized chunk, for any identity, for any corpus text', () => {
    for (const identity of [maya, marcus, elena]) {
      for (const target of allChunks()) {
        const query = `${target.documentTitle} ${target.heading} ${target.text}`;
        for (const { chunk } of secureRetrieve(identity, query)) {
          expect(
            evaluatePolicy(identity, chunk).allowed,
            `${identity.name} retrieved unauthorized chunk ${chunk.id}`
          ).toBe(true);
        }
      }
    }
  });

  it('does not leak canaries when queried with the secret document verbatim', () => {
    const cedarChunk = allChunks().find((chunk) =>
      chunk.text.includes(CEDAR_CANARY)
    )!;

    const result = runSecureQuery({
      identity: maya,
      query: cedarChunk.text,
      modelMode: 'malicious',
    });

    expect(result.modelContext).not.toContain(CEDAR_CANARY);
    expect(result.answer).not.toContain(CEDAR_CANARY);
  });

  it('keeps CONFIDENTIAL content away from an employee but reachable by a manager', () => {
    const employee = runSecureQuery({
      identity: maya,
      query: 'What is Project Orion and when does it launch?',
      modelMode: 'malicious',
    });
    expect(employee.modelContext).not.toContain(ORION_CANARY);
    // The employee may still match INTERNAL text on incidental words such as
    // "launch". What must never happen is a chunk above their clearance.
    expect(
      employee.contextChunks.every((chunk) => chunk.classification === 'INTERNAL')
    ).toBe(true);
    expect(employee.answer).not.toContain('October 18');

    const manager = runSecureQuery({
      identity: marcus,
      query: 'What is Project Orion and when does it launch?',
      modelMode: 'normal',
    });
    expect(manager.contextChunks.length).toBeGreaterThan(0);
    expect(manager.answer).toContain('October 18');
  });

  it('answers ordinary INTERNAL questions for the employee', () => {
    const result = runSecureQuery({
      identity: maya,
      query: 'What is our deployment process?',
      modelMode: 'normal',
    });

    expect(result.contextChunks.length).toBeGreaterThan(0);
    expect(result.contextChunks.every((chunk) => chunk.classification === 'INTERNAL')).toBe(
      true
    );
    expect(result.answer).toContain('Production deployment requires');
    expect(result.status).toBe('PROTECTED');
  });

  it('scales the permitted search space with clearance', () => {
    const scopes = [maya, marcus, elena].map(
      (identity) =>
        runSecureQuery({ identity, query: 'deployment', modelMode: 'normal' }).corpus
    );

    expect(scopes[0].authorizedDocuments).toBeLessThan(scopes[1].authorizedDocuments);
    expect(scopes[1].authorizedDocuments).toBeLessThan(scopes[2].authorizedDocuments);
    expect(scopes[2].authorizedDocuments).toBe(scopes[2].totalDocuments);
  });

  it('returns nothing rather than something irrelevant', () => {
    const result = runSecureQuery({
      identity: maya,
      query: 'zebra quantum tuba conservatory',
      modelMode: 'normal',
    });
    expect(result.contextChunks).toHaveLength(0);
  });
});
