import { NextResponse } from 'next/server';

import { listEvents, metrics } from '@/server/audit';
import { currentIdentity } from '@/server/session';

/**
 * GET /api/audit
 *
 * Returns counts and outcomes only. The audit trail never records the content,
 * titles or existence of documents the caller was not authorized to see — an
 * audit log that reports what you were refused is a disclosure channel.
 */
export async function GET() {
  const identity = await currentIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  return NextResponse.json({ events: listEvents(), metrics: metrics() });
}
