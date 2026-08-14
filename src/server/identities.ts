import 'server-only';

import type { DemoAccount, Identity } from '@/lib/types';

/**
 * Trusted identity records. The ONLY source of truth for role, clearance and
 * department. Nothing in an HTTP request body, prompt, or header can produce or
 * modify an identity.
 */
const IDENTITIES: Identity[] = [
  {
    id: 'maya',
    name: 'Maya Chen',
    email: 'maya@acme.demo',
    role: 'employee',
    clearance: 'INTERNAL',
    department: 'Engineering',
  },
  {
    id: 'marcus',
    name: 'Marcus Rivera',
    email: 'marcus@acme.demo',
    role: 'manager',
    clearance: 'CONFIDENTIAL',
    department: 'Engineering',
  },
  {
    id: 'elena',
    name: 'Elena Vasquez',
    email: 'elena@acme.demo',
    role: 'executive',
    clearance: 'EXECUTIVE',
    department: 'Leadership',
  },
];

/** Demo credentials. Deliberately trivial; this is a demonstration, not an IdP. */
const PASSWORDS: Record<string, string> = {
  maya: 'demo1234',
  marcus: 'demo1234',
  elena: 'demo1234',
};

const BLURBS: Record<string, string> = {
  maya: 'Lowest privilege. The adversary in every attack scenario.',
  marcus: 'Mid-tier clearance. Proves the boundary is graduated, not binary.',
  elena: 'Highest privilege. Proves the same code legitimately discloses.',
};

export const DEFAULT_IDENTITY_ID = 'maya';

export function listIdentities(): Identity[] {
  return IDENTITIES.map((identity) => ({ ...identity }));
}

export function getIdentity(id: string | undefined | null): Identity | null {
  if (!id) return null;
  const found = IDENTITIES.find((identity) => identity.id === id);
  return found ? { ...found } : null;
}

export function getIdentityByEmail(email: string): Identity | null {
  const normalized = email.trim().toLowerCase();
  const found = IDENTITIES.find((identity) => identity.email === normalized);
  return found ? { ...found } : null;
}

/**
 * Resolves a login attempt. Accepts either the demo account id or the email.
 * Returns the trusted identity record — never a client-supplied shape.
 */
export function verifyCredentials(
  identifier: string,
  password: string
): Identity | null {
  const identity = getIdentity(identifier) ?? getIdentityByEmail(identifier);
  if (!identity) return null;
  if (PASSWORDS[identity.id] !== password) return null;
  return identity;
}

/** Login-screen metadata. Safe to serialize to the browser. */
export function listDemoAccounts(): DemoAccount[] {
  return IDENTITIES.map((identity) => ({
    ...identity,
    password: PASSWORDS[identity.id],
    blurb: BLURBS[identity.id],
  }));
}
