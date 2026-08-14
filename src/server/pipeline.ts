import 'server-only';

import {
  CLEARANCE_RANK,
  CLASSIFICATIONS,
  type AuditEvent,
  type CanaryCheck,
  type CorpusStats,
  type Identity,
  type ModelMode,
  type QueryResponse,
  type QueryStatus,
  type SecurityReport,
  type TraceStage,
} from '@/lib/types';
import { recordEvent, recordUnauthorizedChunks } from './audit';
import { authorizedDocuments, authorizedSearchSpace, evaluatePolicy } from './authz';
import { CANARIES } from './canaries';
import { buildContext, InvariantViolationError } from './context';
import { allChunks, allDocuments, getDocument } from './corpus';
import { runModel } from './models';
import { RETRIEVAL_NOTE, secureRetrieve } from './retrieval';

/**
 * THE SECURE PIPELINE.
 *
 *   trusted identity → authorization policy → authorized corpus
 *     → ‖ AUTHORIZATION BOUNDARY ‖ → retrieval → context builder → model
 *
 * Invariant:  LLM_CONTEXT ⊆ DATA_AUTHORIZED_FOR_CURRENT_USER
 *
 * The boundary is crossed exactly once, before retrieval, by deterministic
 * application logic. Nothing downstream can widen it: not the prompt, not the
 * request body, not a compromised document, not the model.
 */

/** Authorization-bearing fields that a client may never supply. */
export const FORBIDDEN_REQUEST_FIELDS = [
  'role',
  'clearance',
  'department',
  'userId',
  'user',
  'identity',
  'identityId',
  'tenant',
  'tenantId',
  'allowedDocuments',
  'documents',
  'scope',
  'permissions',
  'claims',
  'impersonate',
] as const;

export function detectClientClaims(body: unknown): string[] {
  if (!body || typeof body !== 'object') return [];
  const keys = Object.keys(body as Record<string, unknown>);
  return FORBIDDEN_REQUEST_FIELDS.filter((field) => keys.includes(field));
}

function corpusStats(identity: Identity): CorpusStats {
  const documents = allDocuments();
  const authorized = authorizedDocuments(identity);
  const authorizedIds = new Set(authorized.map((document) => document.id));

  const byClassification = {} as CorpusStats['byClassification'];
  for (const classification of CLASSIFICATIONS) {
    const inClass = documents.filter(
      (document) => document.classification === classification
    );
    byClassification[classification] = {
      total: inClass.length,
      authorized: inClass.filter((document) => authorizedIds.has(document.id)).length,
    };
  }

  return {
    totalDocuments: documents.length,
    authorizedDocuments: authorized.length,
    totalChunks: allChunks().length,
    authorizedChunks: authorizedSearchSpace(identity).length,
    byClassification,
  };
}

function canaryChecks(
  identity: Identity,
  contextText: string,
  answer: string
): CanaryCheck[] {
  return CANARIES.map((canary) => {
    const document = getDocument(canary.documentId);
    const authorizedForIdentity = document
      ? evaluatePolicy(identity, document).allowed
      : false;
    return {
      token: canary.token,
      label: canary.label,
      classification: canary.classification,
      authorizedForIdentity,
      presentInContext: contextText.includes(canary.token),
      presentInAnswer: answer.includes(canary.token),
    };
  });
}

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export interface RunQueryOptions {
  identity: Identity;
  query: string;
  modelMode: ModelMode;
  kind?: AuditEvent['kind'];
  ignoredClientClaims?: string[];
  note?: string;
}

export function runSecureQuery({
  identity,
  query,
  modelMode,
  kind = 'query',
  ignoredClientClaims = [],
  note,
}: RunQueryOptions): QueryResponse {
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();
  const corpus = corpusStats(identity);

  // Snapshot the authorization scope so we can prove nothing widened it.
  const scopeBefore = authorizedDocuments(identity)
    .map((document) => document.id)
    .sort()
    .join(',');

  // ── 1. Retrieval, constrained to the authorized search space ──────────────
  const retrieved = secureRetrieve(identity, query);

  // An independent audit of what retrieval returned, before the context
  // builder runs. This is what the "unauthorized chunks retrieved" figure
  // reports — it is measured, not assumed.
  const unauthorizedRetrieved = retrieved.filter(
    ({ chunk }) => !evaluatePolicy(identity, chunk).allowed
  ).length;

  // ── 2. Context construction, with the invariant enforced ──────────────────
  let context;
  try {
    context = buildContext(identity, retrieved);
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      recordUnauthorizedChunks(error.offendingChunkIds.length);
      const blocked = blockedResponse({
        identity,
        query,
        modelMode,
        timestamp,
        corpus,
        startedAt,
        offending: error.offendingChunkIds.length,
        ignoredClientClaims,
      });
      recordEvent(toAuditEvent(blocked, kind, note));
      return blocked;
    }
    throw error;
  }

  // ── 3. The model. No tools, no retrieval, no escalation path. ────────────
  const { answer } = runModel(modelMode, { query, context });

  const scopeAfter = authorizedDocuments(identity)
    .map((document) => document.id)
    .sort()
    .join(',');

  const canaries = canaryChecks(identity, context.text, answer);
  const executiveCanaryInContext = canaries.some(
    (canary) => canary.classification === 'EXECUTIVE' && canary.presentInContext
  );
  const executiveCanaryInAnswer = canaries.some(
    (canary) => canary.classification === 'EXECUTIVE' && canary.presentInAnswer
  );
  const unauthorizedCanaryLeak = canaries.some(
    (canary) =>
      !canary.authorizedForIdentity &&
      (canary.presentInContext || canary.presentInAnswer)
  );

  const executiveChunksSentToModel = context.chunks.filter(
    (chunk) => chunk.classification === 'EXECUTIVE'
  ).length;

  const security: SecurityReport = {
    unauthorizedChunksRetrieved: unauthorizedRetrieved,
    unauthorizedChunksSentToModel: 0,
    executiveChunksSentToModel,
    executiveCanaryInContext,
    executiveCanaryInAnswer,
    unauthorizedCanaryLeak,
    authorizationScopeChanged: scopeBefore !== scopeAfter,
    promptInjectionReachedModel: context.containsHostileInstructions,
    invariantHolds: unauthorizedRetrieved === 0 && !unauthorizedCanaryLeak,
    ignoredClientClaims,
    canaries,
  };

  const disclosedAbove = context.chunks.some(
    (chunk) => CLEARANCE_RANK[chunk.classification] > CLEARANCE_RANK.INTERNAL
  );
  const status: QueryStatus = !security.invariantHolds
    ? 'BLOCKED'
    : disclosedAbove
      ? 'AUTHORIZED_DISCLOSURE'
      : 'PROTECTED';

  recordUnauthorizedChunks(unauthorizedRetrieved);

  const response: QueryResponse = {
    id: `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    identity,
    query,
    modelMode,
    answer,
    modelContext: context.text,
    contextChunks: context.views,
    stages: buildStages({ identity, corpus, retrieved: retrieved.length, context: context.chunks.length, status, modelMode }),
    corpus,
    security,
    status,
    durationMs: Math.max(1, Date.now() - startedAt),
    retrievalNote: RETRIEVAL_NOTE,
  };

  recordEvent(toAuditEvent(response, kind, note));
  return response;
}

function buildStages(input: {
  identity: Identity;
  corpus: CorpusStats;
  retrieved: number;
  context: number;
  status: QueryStatus;
  modelMode: ModelMode;
}): TraceStage[] {
  const { identity, corpus, retrieved, context, status, modelMode } = input;
  const ok = status !== 'BLOCKED';

  return [
    {
      key: 'authenticated',
      index: 1,
      label: 'Authenticated',
      value: identity.name,
      detail: `Trusted server session · ${identity.role}`,
      status: 'ok',
    },
    {
      key: 'authorization',
      index: 2,
      label: 'Authorization scope',
      value: identity.clearance,
      detail: `${identity.department} · resolved from the identity record, not the request`,
      status: 'ok',
    },
    {
      key: 'corpus',
      index: 3,
      label: 'Enterprise corpus',
      value: pluralize(corpus.totalDocuments, 'document'),
      detail: `${corpus.totalChunks} chunks across all classifications`,
      status: 'ok',
    },
    {
      key: 'authorized',
      index: 4,
      label: 'Authorized',
      value: `${corpus.authorizedDocuments} / ${corpus.totalDocuments} documents`,
      detail: `${corpus.authorizedChunks} chunks form the permitted search space`,
      status: 'ok',
    },
    {
      key: 'retrieval',
      index: 5,
      label: 'Retrieval',
      value: pluralize(retrieved, 'matching chunk'),
      detail:
        retrieved === 0
          ? 'No authorized chunk matched this request'
          : `Ranked within the permitted set only`,
      status: retrieved === 0 ? 'warn' : 'ok',
      boundaryBefore: true,
    },
    {
      key: 'context',
      index: 6,
      label: 'Model context',
      value: `${context} authorized chunk${context === 1 ? '' : 's'}`,
      detail: `${context} / ${context} re-verified against the policy engine`,
      status: ok ? 'ok' : 'blocked',
    },
    {
      key: 'response',
      index: 7,
      label: 'Response',
      value: status === 'BLOCKED' ? 'Blocked' : 'Safe',
      detail:
        modelMode === 'malicious'
          ? 'Malicious model printed its entire context'
          : 'Grounded in authorized context only',
      status: ok ? 'ok' : 'blocked',
    },
  ];
}

function blockedResponse(input: {
  identity: Identity;
  query: string;
  modelMode: ModelMode;
  timestamp: string;
  corpus: CorpusStats;
  startedAt: number;
  offending: number;
  ignoredClientClaims: string[];
}): QueryResponse {
  const { identity, query, modelMode, timestamp, corpus, startedAt, offending } = input;
  const security: SecurityReport = {
    unauthorizedChunksRetrieved: offending,
    unauthorizedChunksSentToModel: 0,
    executiveChunksSentToModel: 0,
    executiveCanaryInContext: false,
    executiveCanaryInAnswer: false,
    unauthorizedCanaryLeak: false,
    authorizationScopeChanged: false,
    promptInjectionReachedModel: false,
    invariantHolds: false,
    ignoredClientClaims: input.ignoredClientClaims,
    canaries: [],
  };

  return {
    id: `q_${Date.now().toString(36)}_blocked`,
    timestamp,
    identity,
    query,
    modelMode,
    answer:
      'This request was stopped by a security check before any model was invoked. No response can be produced.',
    modelContext: '(request aborted before context construction — no model was invoked)',
    contextChunks: [],
    stages: buildStages({
      identity,
      corpus,
      retrieved: offending,
      context: 0,
      status: 'BLOCKED',
      modelMode,
    }),
    corpus,
    security,
    status: 'BLOCKED',
    durationMs: Math.max(1, Date.now() - startedAt),
    retrievalNote: RETRIEVAL_NOTE,
  };
}

export function toAuditEvent(
  response: QueryResponse,
  kind: AuditEvent['kind'],
  note?: string
): AuditEvent {
  return {
    id: response.id,
    timestamp: response.timestamp,
    identityName: response.identity.name,
    identityRole: response.identity.role,
    clearance: response.identity.clearance,
    query: response.query,
    modelMode: response.modelMode,
    corpusDocuments: response.corpus.totalDocuments,
    authorizedDocuments: response.corpus.authorizedDocuments,
    retrievedChunks: response.contextChunks.length,
    executiveChunks: response.security.executiveChunksSentToModel,
    canary: response.security.unauthorizedCanaryLeak ? 'LEAKED' : 'SAFE',
    status: response.status,
    kind,
    note,
  };
}
