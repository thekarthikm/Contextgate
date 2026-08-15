import 'server-only';

import type { AuditEvent, SecurityMetrics } from '@/lib/types';

/**
 * In-memory audit trail and live security metrics.
 *
 * Held on globalThis so the trail survives Next.js hot reloads in development.
 * A demo does not need durable storage — and a durable store is exactly the
 * kind of invisible infrastructure this build is meant to avoid.
 *
 * Audit records deliberately contain COUNTS, never unauthorized content. An
 * audit log that records what a user was refused is itself a disclosure
 * channel.
 */

const MAX_EVENTS = 60;

interface AuditState {
  events: AuditEvent[];
  metrics: SecurityMetrics;
}

const freshMetrics = (): SecurityMetrics => ({
  queriesExecuted: 0,
  attacksExecuted: 0,
  unauthorizedChunksSent: 0,
  canaryLeaks: 0,
  invariantStatus: 'HEALTHY',
});

const globalStore = globalThis as typeof globalThis & {
  __contextgateAudit?: AuditState;
};

function state(): AuditState {
  if (!globalStore.__contextgateAudit) {
    globalStore.__contextgateAudit = { events: [], metrics: freshMetrics() };
  }
  return globalStore.__contextgateAudit;
}

export function recordEvent(event: AuditEvent): void {
  const store = state();
  store.events.unshift(event);
  if (store.events.length > MAX_EVENTS) store.events.length = MAX_EVENTS;

  if (event.kind === 'query') store.metrics.queriesExecuted += 1;
  else store.metrics.attacksExecuted += 1;

  if (event.canary === 'LEAKED') store.metrics.canaryLeaks += 1;
  if (event.status === 'BLOCKED') store.metrics.invariantStatus = 'VIOLATED';
}

/**
 * Counts unauthorized chunks that crossed the boundary on the SECURE path.
 * Must remain zero for the lifetime of the process.
 */
export function recordUnauthorizedChunks(count: number): void {
  if (count <= 0) return;
  const store = state();
  store.metrics.unauthorizedChunksSent += count;
  store.metrics.invariantStatus = 'VIOLATED';
}

export function listEvents(): AuditEvent[] {
  return [...state().events];
}

export function metrics(): SecurityMetrics {
  return { ...state().metrics };
}

export function resetAudit(): void {
  globalStore.__contextgateAudit = { events: [], metrics: freshMetrics() };
}
