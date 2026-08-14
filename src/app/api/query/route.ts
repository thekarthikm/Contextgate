import { NextResponse } from 'next/server';

import type { AuditEvent, ModelMode } from '@/lib/types';
import { detectClientClaims, runSecureQuery } from '@/server/pipeline';
import { currentIdentity } from '@/server/session';

/**
 * POST /api/query
 *
 * The only inputs this route reads from the request body are `query` and
 * `modelMode`. Both are non-authorization-bearing.
 *
 * Any authorization-bearing field a client sends — role, clearance, department,
 * userId, tenant, allowedDocuments, … — is recorded as an attempted claim and
 * then discarded. It is never merged into, compared against, or allowed to
 * influence the trusted identity, which comes from the signed session cookie.
 *
 * This route MUST NEVER import anything from src/server/demo-insecure/.
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

  // Recorded so the Attack Lab can show the claim being ignored. Never used.
  const ignoredClientClaims = detectClientClaims(body);

  const raw = (body ?? {}) as Record<string, unknown>;
  const query = typeof raw.query === 'string' ? raw.query.trim() : '';
  const modelMode: ModelMode = raw.modelMode === 'malicious' ? 'malicious' : 'normal';
  const kind: AuditEvent['kind'] = raw.kind === 'attack' ? 'attack' : 'query';
  const note = typeof raw.note === 'string' ? raw.note.slice(0, 120) : undefined;

  if (query.length === 0) {
    return NextResponse.json({ error: 'A query is required.' }, { status: 400 });
  }
  if (query.length > 2000) {
    return NextResponse.json({ error: 'Query is too long.' }, { status: 413 });
  }

  try {
    const result = runSecureQuery({
      identity,
      query,
      modelMode,
      kind,
      ignoredClientClaims,
      note,
    });
    return NextResponse.json(result);
  } catch {
    // Generic error only. Failure modes must not describe the corpus.
    return NextResponse.json(
      { error: 'A security check prevented this request from completing.' },
      { status: 500 }
    );
  }
}
