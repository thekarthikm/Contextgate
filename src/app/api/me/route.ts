import { NextResponse } from 'next/server';

import { listDemoAccounts } from '@/server/identities';
import { currentIdentity } from '@/server/session';

/**
 * GET /api/me
 *
 * The browser learns who it is by asking the server. It is never told by, and
 * never tells, itself.
 */
export async function GET() {
  const identity = await currentIdentity();
  return NextResponse.json({
    identity,
    accounts: listDemoAccounts(),
  });
}
