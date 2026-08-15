import { getIdentity } from '@/server/identities';
import type { Identity } from '@/lib/types';

export const maya: Identity = getIdentity('maya')!;
export const marcus: Identity = getIdentity('marcus')!;
export const elena: Identity = getIdentity('elena')!;

export const EXECUTIVE_CANARY_TOKENS = [
  'EXEC_ONLY_CEDAR_7Q2M9X',
  'EXEC_RESTRUCTURE_91P4LX',
  'EXEC_COMP_83K2VQ',
] as const;

export const CEDAR_CANARY = 'EXEC_ONLY_CEDAR_7Q2M9X';
export const ORION_CANARY = 'CONFIDENTIAL_ORION_4K8Q2';

/** Values that must never appear in an employee's model input. */
export const EXECUTIVE_SECRETS = [
  ...EXECUTIVE_CANARY_TOKENS,
  '$187,430,921',
  'Cedar Dynamics',
] as const;
