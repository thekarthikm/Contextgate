import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

import type { Identity } from '@/lib/types';
import { getIdentity } from './identities';

/**
 * SESSION / TRUSTED SERVER IDENTITY.
 *
 * The session cookie carries an identity *id* and an HMAC over it. The server
 * then loads the identity record from ./identities.ts. Role, clearance and
 * department are therefore never transported from the browser — they are looked
 * up. Even a forged cookie can only ever name an identity, and it cannot do
 * that without the signing key.
 *
 * There are no real secrets in this application. The default signing key is
 * published below on purpose so the demo runs with zero configuration; set
 * CONTEXTGATE_SESSION_SECRET to override it.
 */

const COOKIE_NAME = 'cg_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const DEFAULT_SECRET = 'contextgate-public-demo-key-not-a-secret';

function secret(): string {
  return process.env.CONTEXTGATE_SESSION_SECRET || DEFAULT_SECRET;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function serializeSession(identityId: string): string {
  const issued = Date.now().toString(36);
  const payload = `${identityId}.${issued}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Verifies a cookie value and returns the TRUSTED identity record, or null.
 * The cookie's contents are never trusted beyond selecting a known identity.
 */
export function identityFromCookie(value: string | undefined): Identity | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;

  const [identityId, issued, signature] = parts;
  if (!safeEqual(signature, sign(`${identityId}.${issued}`))) return null;

  const issuedAt = Number.parseInt(issued, 36);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > SESSION_TTL_SECONDS * 1000) return null;

  return getIdentity(identityId);
}

/** Resolves the trusted identity for the current request. */
export async function currentIdentity(): Promise<Identity | null> {
  const store = await cookies();
  return identityFromCookie(store.get(COOKIE_NAME)?.value);
}

export async function establishSession(identity: Identity): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, serializeSession(identity.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
