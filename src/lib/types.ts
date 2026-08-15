/**
 * Shared, CLIENT-SAFE contract types.
 *
 * This module is imported by both the browser and the server, so it must never
 * contain document bodies, canaries, or any other sensitive demonstration data.
 * It contains types and harmless display constants only.
 */

export type Classification = 'INTERNAL' | 'CONFIDENTIAL' | 'EXECUTIVE';

export type Role = 'employee' | 'manager' | 'executive';

export type ModelMode = 'normal' | 'malicious';

/** Ordered clearance lattice. Higher number dominates. */
export const CLEARANCE_RANK: Record<Classification, number> = {
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  EXECUTIVE: 3,
};

export const CLASSIFICATIONS: Classification[] = ['INTERNAL', 'CONFIDENTIAL', 'EXECUTIVE'];

/** A trusted identity. Established server-side only, never accepted from a client. */
export interface Identity {
  id: string;
  name: string;
  email: string;
  role: Role;
  clearance: Classification;
  department: string;
}

/** Public description of a demo account, safe to render on the login screen. */
export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  clearance: Classification;
  department: string;
  password: string;
  blurb: string;
}

/**
 * A retrieved chunk, as returned to the client. By construction this only ever
 * describes content the current identity is authorized to read.
 */
export interface ChunkView {
  id: string;
  documentId: string;
  documentTitle: string;
  heading: string;
  classification: Classification;
  department: string | null;
  text: string;
  score: number;
  /** True when this authorized chunk carries instructions aimed at the model. */
  hostileInstructions: boolean;
}

export type StageStatus = 'idle' | 'active' | 'ok' | 'warn' | 'blocked';

export interface TraceStage {
  key: string;
  index: number;
  label: string;
  value: string;
  detail: string;
  status: StageStatus;
  /** Renders the AUTHORIZATION BOUNDARY divider immediately before this stage. */
  boundaryBefore?: boolean;
}

export interface CanaryCheck {
  token: string;
  label: string;
  classification: Classification;
  /** Whether the current identity is cleared for the document holding it. */
  authorizedForIdentity: boolean;
  presentInContext: boolean;
  presentInAnswer: boolean;
}

export interface CorpusStats {
  totalDocuments: number;
  authorizedDocuments: number;
  totalChunks: number;
  authorizedChunks: number;
  byClassification: Record<Classification, { total: number; authorized: number }>;
}

export interface SecurityReport {
  unauthorizedChunksRetrieved: number;
  unauthorizedChunksSentToModel: number;
  executiveChunksSentToModel: number;
  /** Raw presence of an EXECUTIVE canary in the model input. */
  executiveCanaryInContext: boolean;
  executiveCanaryInAnswer: boolean;
  /** Presence of a canary the current identity is NOT cleared for. Must be false. */
  unauthorizedCanaryLeak: boolean;
  authorizationScopeChanged: boolean;
  promptInjectionReachedModel: boolean;
  invariantHolds: boolean;
  /** Authorization-bearing fields a client tried to inject into the request. */
  ignoredClientClaims: string[];
  canaries: CanaryCheck[];
}

export type QueryStatus = 'PROTECTED' | 'AUTHORIZED_DISCLOSURE' | 'BLOCKED';

export interface QueryResponse {
  id: string;
  timestamp: string;
  identity: Identity;
  query: string;
  modelMode: ModelMode;
  answer: string;
  /** The verbatim string handed to the model. Nothing else reaches it. */
  modelContext: string;
  contextChunks: ChunkView[];
  stages: TraceStage[];
  corpus: CorpusStats;
  security: SecurityReport;
  status: QueryStatus;
  durationMs: number;
  retrievalNote: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  identityName: string;
  identityRole: Role;
  clearance: Classification;
  query: string;
  modelMode: ModelMode;
  corpusDocuments: number;
  authorizedDocuments: number;
  retrievedChunks: number;
  executiveChunks: number;
  canary: 'SAFE' | 'LEAKED';
  status: QueryStatus;
  kind: 'query' | 'attack' | 'tamper' | 'comparison';
  note?: string;
}

export interface SecurityMetrics {
  queriesExecuted: number;
  attacksExecuted: number;
  unauthorizedChunksSent: number;
  canaryLeaks: number;
  invariantStatus: 'HEALTHY' | 'VIOLATED';
}

export interface AuditResponse {
  events: AuditEvent[];
  metrics: SecurityMetrics;
}

export interface TamperResponse {
  attemptedRequestBody: string;
  clientClaim: {
    role: string;
    clearance: string;
    department: string;
    userId: string;
  };
  trustedIdentity: Identity;
  ignoredClientClaims: string[];
  verdict: 'CLIENT AUTHORIZATION CLAIMS IGNORED';
  result: QueryResponse;
}

/** One side of the insecure-vs-secure comparison. */
export interface ComparisonSide {
  pipeline: string[];
  documentsSearched: number;
  chunksInContext: number;
  executiveChunksInContext: number;
  modelContext: string;
  answer: string;
  canaryPresent: boolean;
  verdict: 'LEAKED' | 'PROTECTED';
}

export interface ComparisonResponse {
  query: string;
  identity: Identity;
  canaryToken: string;
  insecure: ComparisonSide;
  secure: ComparisonSide;
}

export interface AttackDefinition {
  id: string;
  name: string;
  category: string;
  prompt: string;
  explanation: string;
}

export const SECTIONS = ['demo', 'attack', 'architecture', 'audit'] as const;
export type SectionId = (typeof SECTIONS)[number];
