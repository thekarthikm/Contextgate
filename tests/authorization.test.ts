import { describe, expect, it } from 'vitest';

import { authorizeDocument, authorizedDocuments, authorizedSearchSpace } from '@/server/authz';
import { allDocuments, getDocument } from '@/server/corpus';
import { elena, marcus, maya } from './helpers';

const doc = (id: string) => getDocument(id)!;

describe('authorization policy engine', () => {
  it('gives every document a known classification', () => {
    expect(allDocuments()).toHaveLength(10);
    for (const document of allDocuments()) {
      expect(['INTERNAL', 'CONFIDENTIAL', 'EXECUTIVE']).toContain(
        document.classification
      );
    }
  });

  describe('employee (INTERNAL clearance)', () => {
    it('can retrieve INTERNAL documents in its department', () => {
      expect(authorizeDocument(maya, doc('engineering-handbook'))).toBe(true);
      expect(authorizeDocument(maya, doc('deployment-playbook'))).toBe(true);
    });

    it('cannot retrieve CONFIDENTIAL documents', () => {
      expect(authorizeDocument(maya, doc('orion-roadmap'))).toBe(false);
      expect(authorizeDocument(maya, doc('customer-escalations'))).toBe(false);
      expect(authorizeDocument(maya, doc('security-postmortem'))).toBe(false);
    });

    it('cannot retrieve EXECUTIVE documents', () => {
      expect(authorizeDocument(maya, doc('cedar-acquisition'))).toBe(false);
      expect(authorizeDocument(maya, doc('fy27-restructuring'))).toBe(false);
      expect(authorizeDocument(maya, doc('exec-comp-review'))).toBe(false);
    });

    it('cannot retrieve an INTERNAL document scoped to another department', () => {
      // Department restrictions are enforced independently of clearance.
      expect(authorizeDocument(maya, doc('product-support-guide'))).toBe(false);
    });
  });

  describe('manager (CONFIDENTIAL clearance)', () => {
    it('can retrieve CONFIDENTIAL documents in its department', () => {
      expect(authorizeDocument(marcus, doc('orion-roadmap'))).toBe(true);
      expect(authorizeDocument(marcus, doc('security-postmortem'))).toBe(true);
    });

    it('cannot retrieve EXECUTIVE documents', () => {
      expect(authorizeDocument(marcus, doc('cedar-acquisition'))).toBe(false);
      expect(authorizeDocument(marcus, doc('fy27-restructuring'))).toBe(false);
      expect(authorizeDocument(marcus, doc('exec-comp-review'))).toBe(false);
    });
  });

  describe('executive (EXECUTIVE clearance)', () => {
    it('can retrieve EXECUTIVE documents', () => {
      expect(authorizeDocument(elena, doc('cedar-acquisition'))).toBe(true);
      expect(authorizeDocument(elena, doc('fy27-restructuring'))).toBe(true);
      expect(authorizeDocument(elena, doc('exec-comp-review'))).toBe(true);
    });
  });

  it('produces strictly widening authorized corpora up the clearance lattice', () => {
    const scope = (identity: typeof maya) =>
      new Set(authorizedDocuments(identity).map((document) => document.id));

    const mayaScope = scope(maya);
    const marcusScope = scope(marcus);
    const elenaScope = scope(elena);

    expect(mayaScope.size).toBe(3);
    expect(marcusScope.size).toBe(5);
    expect(elenaScope.size).toBe(10);

    for (const id of mayaScope) expect(marcusScope.has(id)).toBe(true);
    for (const id of marcusScope) expect(elenaScope.has(id)).toBe(true);
  });

  it('never places an unauthorized chunk in a permitted search space', () => {
    for (const identity of [maya, marcus, elena]) {
      for (const chunk of authorizedSearchSpace(identity)) {
        expect(authorizeDocument(identity, chunk)).toBe(true);
      }
    }
  });
});
