import { NextResponse } from 'next/server';

import { resetAudit } from '@/server/audit';
import { DEFAULT_IDENTITY_ID, getIdentity } from '@/server/identities';
import { establishSession } from '@/server/session';

/**
 * POST /api/demo/reset
 *
 * Clears attack counters and the audit trail, then restores the default Maya
 * session. No application restart required.
 */
export async function POST() {
  resetAudit();
  const identity = getIdentity(DEFAULT_IDENTITY_ID)!;
  await establishSession(identity);
  return NextResponse.json({ ok: true, identity });
}
