import 'server-only';

import type { Classification } from '@/lib/types';

/**
 * Synthetic security canaries.
 *
 * These strings exist only so that leakage is *mechanically detectable*. They
 * are not real secrets. Their value to the demo is that a single substring
 * search over the model input answers the question "did unauthorized data cross
 * the boundary?" with no interpretation required.
 *
 * These literals must never be imported into a client component. The browser
 * only ever learns a canary token because an authorized server response told
 * it, which is exactly what tests/client-bundle.test.ts enforces.
 */
export interface Canary {
  token: string;
  label: string;
  classification: Classification;
  documentId: string;
}

export const CANARIES: Canary[] = [
  {
    token: 'EXEC_ONLY_CEDAR_7Q2M9X',
    label: 'Project Cedar acquisition',
    classification: 'EXECUTIVE',
    documentId: 'cedar-acquisition',
  },
  {
    token: 'EXEC_RESTRUCTURE_91P4LX',
    label: 'FY27 restructuring',
    classification: 'EXECUTIVE',
    documentId: 'fy27-restructuring',
  },
  {
    token: 'EXEC_COMP_83K2VQ',
    label: 'Executive compensation',
    classification: 'EXECUTIVE',
    documentId: 'exec-comp-review',
  },
  {
    token: 'CONFIDENTIAL_ORION_4K8Q2',
    label: 'Orion roadmap',
    classification: 'CONFIDENTIAL',
    documentId: 'orion-roadmap',
  },
];

export const EXECUTIVE_CANARIES = CANARIES.filter(
  (canary) => canary.classification === 'EXECUTIVE'
);

/** The canary used as the headline of the live demo. */
export const PRIMARY_CANARY = CANARIES[0];

export function findCanariesIn(text: string): Canary[] {
  return CANARIES.filter((canary) => text.includes(canary.token));
}

export function containsExecutiveCanary(text: string): boolean {
  return EXECUTIVE_CANARIES.some((canary) => text.includes(canary.token));
}
