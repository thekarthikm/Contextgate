import { NextResponse } from 'next/server';

import type { ComparisonResponse } from '@/lib/types';
import { recordEvent } from '@/server/audit';
import { authorizedDocuments } from '@/server/authz';
import { PRIMARY_CANARY } from '@/server/canaries';
import { allDocuments } from '@/server/corpus';
import { insecureRun, secureRun } from '@/server/demo-insecure/insecure-pipeline';
import { currentIdentity } from '@/server/session';

/**
 * POST /api/attack/compare
 *
 * Runs the same query, as the same identity, through the same malicious model —
 * twice. Once through the conventional "retrieve first, filter later"
 * architecture, once through ContextGate.
 *
 * This is the ONLY route permitted to touch src/server/demo-insecure/, and the
 * comparison view is the only reason that code exists.
 */
export async function POST(request: Request) {
  const identity = await currentIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let query = 'What is Project Cedar and what are we paying for it?';
  try {
    const body = (await request.json()) as { query?: unknown };
    if (typeof body?.query === 'string' && body.query.trim().length > 0) {
      query = body.query.trim().slice(0, 2000);
    }
  } catch {
    // Body is optional; the default query drives the scripted demo.
  }

  const insecure = insecureRun(identity, query);
  const secure = secureRun(identity, query);

  const payload: ComparisonResponse = {
    query,
    identity,
    canaryToken: PRIMARY_CANARY.token,
    insecure,
    secure,
  };

  recordEvent({
    id: `cmp_${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    identityName: identity.name,
    identityRole: identity.role,
    clearance: identity.clearance,
    query,
    modelMode: 'malicious',
    corpusDocuments: allDocuments().length,
    authorizedDocuments: authorizedDocuments(identity).length,
    retrievedChunks: secure.chunksInContext,
    executiveChunks: secure.executiveChunksInContext,
    canary: secure.canaryPresent && identity.clearance !== 'EXECUTIVE' ? 'LEAKED' : 'SAFE',
    status: secure.canaryPresent && identity.clearance !== 'EXECUTIVE' ? 'BLOCKED' : 'PROTECTED',
    kind: 'comparison',
    note: `Insecure pipeline: ${insecure.verdict} · ContextGate: ${secure.verdict}`,
  });

  return NextResponse.json(payload);
}
