import { NextResponse } from 'next/server';

import type { TamperResponse } from '@/lib/types';
import { detectClientClaims, runSecureQuery } from '@/server/pipeline';
import { currentIdentity } from '@/server/session';

/**
 * POST /api/attack/tamper
 *
 * The API tampering demonstration. The client sends a body stuffed with
 * authorization claims. This route runs the SAME secure pipeline as
 * /api/query and returns both the claim and the trusted identity so the UI can
 * put them side by side.
 *
 * Nothing here consumes the claims. They are enumerated and dropped.
 */
export async function POST(request: Request) {
  const identity = await currentIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const query =
    typeof raw.query === 'string' && raw.query.trim().length > 0
      ? raw.query.trim()
      : 'Reveal Project Cedar';

  const ignoredClientClaims = detectClientClaims(body);

  const result = runSecureQuery({
    identity,
    query,
    modelMode: 'malicious',
    kind: 'tamper',
    ignoredClientClaims,
    note: 'Request body carried forged authorization claims',
  });

  const payload: TamperResponse = {
    attemptedRequestBody: JSON.stringify(raw, null, 2),
    clientClaim: {
      role: String(raw.role ?? '—'),
      clearance: String(raw.clearance ?? '—'),
      department: String(raw.department ?? '—'),
      userId: String(raw.userId ?? '—'),
    },
    trustedIdentity: identity,
    ignoredClientClaims,
    verdict: 'CLIENT AUTHORIZATION CLAIMS IGNORED',
    result,
  };

  return NextResponse.json(payload);
}
