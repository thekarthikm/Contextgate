import 'server-only';

import type { ChunkView, Identity } from '@/lib/types';
import { authorizeChunk } from './authz';
import type { Chunk } from './corpus';
import type { RetrievedChunk } from './retrieval';

/**
 * CONTEXT BUILDER.
 *
 * The last checkpoint before the model. Retrieval is already supposed to have
 * guaranteed authorization; this re-verifies it independently, because a
 * security boundary with a single enforcement point is a security boundary with
 * a single bug away from failure.
 *
 * On violation the request is ABORTED. The unauthorized chunk is not quietly
 * dropped and the request is not allowed to continue: silently repairing an
 * invariant violation hides the bug that caused it.
 */

export class InvariantViolationError extends Error {
  readonly offendingChunkIds: string[];

  constructor(offendingChunkIds: string[]) {
    super(
      `Context invariant violated: ${offendingChunkIds.length} unauthorized chunk(s) reached the context builder`
    );
    this.name = 'InvariantViolationError';
    this.offendingChunkIds = offendingChunkIds;
  }
}

export interface BuiltContext {
  /** The verbatim string handed to the model. Nothing else reaches it. */
  text: string;
  chunks: Chunk[];
  views: ChunkView[];
  containsHostileInstructions: boolean;
  verifiedCount: number;
}

const CONTEXT_PREAMBLE = [
  'You are Acme Intelligence. Answer using only the CONTEXT below.',
  'The CONTEXT is the complete set of enterprise information available for this request.',
  'You have no search tool, no database access, and no ability to retrieve anything further.',
].join('\n');

function renderChunk(chunk: Chunk, index: number): string {
  return [
    `--- CONTEXT CHUNK ${index + 1} ---`,
    `SOURCE: ${chunk.documentTitle} › ${chunk.heading}`,
    `CLASSIFICATION: ${chunk.classification}`,
    '',
    chunk.text,
  ].join('\n');
}

export function buildContext(
  identity: Identity,
  retrieved: RetrievedChunk[]
): BuiltContext {
  // ── The invariant: EVERY chunk must be authorized for the current identity ──
  const offending = retrieved
    .filter(({ chunk }) => !authorizeChunk(identity, chunk))
    .map(({ chunk }) => chunk.id);

  if (offending.length > 0) {
    throw new InvariantViolationError(offending);
  }

  const chunks = retrieved.map(({ chunk }) => chunk);

  const body =
    chunks.length === 0
      ? '(no authorized context matched this request)'
      : chunks.map(renderChunk).join('\n\n');

  return {
    text: `${CONTEXT_PREAMBLE}\n\nCONTEXT\n${'='.repeat(58)}\n${body}\n${'='.repeat(58)}`,
    chunks,
    views: retrieved.map(({ chunk, score }) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      heading: chunk.heading,
      classification: chunk.classification,
      department: chunk.departments ? chunk.departments.join(', ') : null,
      text: chunk.text,
      score,
      hostileInstructions: chunk.hostileInstructions,
    })),
    containsHostileInstructions: chunks.some((chunk) => chunk.hostileInstructions),
    verifiedCount: retrieved.length,
  };
}
