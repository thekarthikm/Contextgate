import { NextResponse } from 'next/server';

import { listDemoAccounts, verifyCredentials } from '@/server/identities';
import { establishSession } from '@/server/session';

/**
 * POST /api/login
 *
 * Accepts an identifier and a password. Everything else about the identity —
 * role, clearance, department — is looked up server-side. A client cannot
 * assert any of it, here or anywhere else.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const { identifier, password } =
    (body as { identifier?: unknown; password?: unknown }) ?? {};

  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return NextResponse.json(
      { error: 'An identifier and password are required.' },
      { status: 400 }
    );
  }

  const identity = verifyCredentials(identifier, password);
  if (!identity) {
    // Deliberately does not distinguish unknown account from wrong password.
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  await establishSession(identity);
  return NextResponse.json({ identity });
}

/** GET /api/login — the demo account list shown on the sign-in screen. */
export async function GET() {
  return NextResponse.json({ accounts: listDemoAccounts() });
}
