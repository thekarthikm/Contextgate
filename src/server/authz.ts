import 'server-only';

import { CLEARANCE_RANK, type Classification, type Identity } from '@/lib/types';
import { allChunks, allDocuments, type Chunk, type EnterpriseDocument } from './corpus';

/**
 * AUTHORIZATION POLICY ENGINE.
 *
 * Deterministic application logic. The model is never consulted, never asked to
 * adjudicate, and never told what it was not allowed to see.
 *
 * Policy:
 *   1. Clearance dominance — identity.clearance >= document.classification.
 *   2. Department scope   — if the document is department-restricted, the
 *                           identity's department must be listed, unless the
 *                           identity holds EXECUTIVE clearance, which carries
 *                           organisation-wide scope.
 */

export interface PolicyDecision {
  allowed: boolean;
  clearanceSatisfied: boolean;
  departmentSatisfied: boolean;
  reason: string;
}

function clearanceDominates(identity: Identity, classification: Classification): boolean {
  return CLEARANCE_RANK[identity.clearance] >= CLEARANCE_RANK[classification];
}

function departmentPermits(
  identity: Identity,
  departments: string[] | null
): boolean {
  if (!departments || departments.length === 0) return true;
  if (identity.clearance === 'EXECUTIVE') return true; // organisation-wide scope
  return departments.includes(identity.department);
}

export function evaluatePolicy(
  identity: Identity,
  target: { classification: Classification; departments: string[] | null }
): PolicyDecision {
  const clearanceSatisfied = clearanceDominates(identity, target.classification);
  const departmentSatisfied = departmentPermits(identity, target.departments);
  const allowed = clearanceSatisfied && departmentSatisfied;

  let reason: string;
  if (allowed) {
    reason = `${identity.clearance} clearance dominates ${target.classification}`;
  } else if (!clearanceSatisfied) {
    reason = `${identity.clearance} clearance does not dominate ${target.classification}`;
  } else {
    reason = `department ${identity.department} is outside the document scope`;
  }

  return { allowed, clearanceSatisfied, departmentSatisfied, reason };
}

/** The single authorization predicate required by the specification. */
export function authorizeDocument(
  identity: Identity,
  document: Pick<EnterpriseDocument, 'classification' | 'departments'>
): boolean {
  return evaluatePolicy(identity, document).allowed;
}

export function authorizeChunk(identity: Identity, chunk: Chunk): boolean {
  return evaluatePolicy(identity, chunk).allowed;
}

/**
 * The authorized corpus for an identity. This is the ONLY set any search path
 * is permitted to touch.
 */
export function authorizedDocuments(identity: Identity): EnterpriseDocument[] {
  return allDocuments().filter((document) => authorizeDocument(identity, document));
}

/** The permitted search space: chunks of authorized documents, nothing else. */
export function authorizedSearchSpace(identity: Identity): Chunk[] {
  return allChunks().filter((chunk) => authorizeChunk(identity, chunk));
}
