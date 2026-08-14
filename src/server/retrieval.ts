import 'server-only';

import type { Identity } from '@/lib/types';
import { authorizedSearchSpace } from './authz';
import type { Chunk } from './corpus';

/**
 * SECURE RETRIEVAL.
 *
 * The ordering below is the entire security property of this application:
 *
 *   1. determine the authorized documents for the trusted identity
 *   2. construct the permitted search space from them
 *   3. rank ONLY within that permitted set
 *   4. select the top matching chunks
 *   5. forward only those chunks
 *
 * The forbidden ordering — search everything, then filter — is implemented
 * separately and deliberately in ./demo-insecure/ for the comparison view.
 * Unauthorized content is never materialised on this path at all.
 */

export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
}

export interface Retriever {
  retrieve(identity: Identity, query: string): RetrievedChunk[];
}

export const RETRIEVAL_NOTE =
  'Demo retrieval uses local relevance scoring. In production the same authorization boundary wraps the enterprise vector database, knowledge graph, search engine, or RAG retriever.';

const MAX_CHUNKS = 4;
/** A chunk must reach this share of the query's total term weight to qualify. */
const MIN_COVERAGE = 0.3;
/** A chunk must reach this share of the best chunk's score to be included. */
const RELATIVE_CUTOFF = 0.45;

const STOPWORDS = new Set([
  'a', 'about', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been',
  'but', 'by', 'can', 'did', 'do', 'does', 'doing', 'dont', 'each', 'every',
  'for', 'from', 'get', 'give', 'had', 'has', 'have', 'he', 'her', 'here',
  'hidden', 'him', 'his', 'how', 'i', 'if', 'ignore', 'in', 'into', 'is', 'it',
  'its', 'just', 'know', 'let', 'like', 'list', 'many', 'me', 'much', 'must',
  'my', 'need', 'no', 'not', 'now', 'of', 'on', 'one', 'only', 'or', 'our',
  'out', 'over', 'previous', 'print', 'question', 'reveal', 'said', 'say',
  'see', 'she', 'should', 'show', 'so', 'some', 'tell', 'than', 'that', 'the',
  'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'up', 'us',
  'use', 'want', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'why', 'will', 'with', 'would', 'you', 'your',
]);

/** Normalize to lowercase alphanumeric tokens with a light plural strip. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$]+/g, ' ')
    .split(' ')
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map(stem);
}

/**
 * Deliberately crude suffix stripping, applied in sequence so that inflections
 * of the same word collapse onto one key ("deployment", "deploys", "deployed"
 * and "deploying" all become "deploy"). Precision here is irrelevant to the
 * security property; consistency is all that matters.
 */
function stem(token: string): string {
  let t = token;
  if (t.length > 4 && t.endsWith('ies')) t = `${t.slice(0, -3)}y`;
  else if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
  if (t.length > 5 && t.endsWith('ing')) t = t.slice(0, -3);
  else if (t.length > 4 && t.endsWith('ed')) t = t.slice(0, -2);
  if (t.length > 6 && t.endsWith('ment')) t = t.slice(0, -4);
  if (t.length > 5 && t.endsWith('al')) t = t.slice(0, -2);
  if (t.length > 4 && t.endsWith('e')) t = t.slice(0, -1);
  return t;
}

/**
 * Inverse document frequency computed over the CANDIDATE SET ONLY.
 *
 * This matters. If term statistics were derived from the whole corpus, the
 * relevance scores handed to a low-clearance caller would be a function of
 * documents that caller cannot read — a statistical side channel out of the
 * restricted set. Deriving them from the permitted search space means every
 * number on this path is a function of authorized data alone.
 */
interface Vocabulary {
  idf(token: string): number;
  has(token: string): boolean;
}

function buildVocabulary(candidates: Chunk[]): Vocabulary {
  const documentFrequency = new Map<string, number>();
  for (const chunk of candidates) {
    const seen = new Set(
      tokenize(`${chunk.documentTitle} ${chunk.heading} ${chunk.text}`)
    );
    for (const token of seen) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  const size = candidates.length;
  return {
    has: (token) => documentFrequency.has(token),
    idf: (token) => {
      const frequency = documentFrequency.get(token) ?? 0;
      return Math.log((size + 1) / (frequency + 0.5));
    },
  };
}

const TITLE_WEIGHT = 1.1;
const HEADING_WEIGHT = 0.8;

function scoreChunk(
  chunk: Chunk,
  queryTerms: string[],
  vocabulary: Vocabulary
): { score: number; coverage: number } {
  const titleTokens = new Set(tokenize(chunk.documentTitle));
  const headingTokens = new Set(tokenize(chunk.heading));
  const bodyCounts = new Map<string, number>();
  for (const token of tokenize(chunk.text)) {
    bodyCounts.set(token, (bodyCounts.get(token) ?? 0) + 1);
  }

  let score = 0;
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const term of new Set(queryTerms)) {
    const weight = vocabulary.idf(term);
    totalWeight += weight;

    const inBody = bodyCounts.get(term) ?? 0;
    const inHeading = headingTokens.has(term);
    const inTitle = titleTokens.has(term);
    if (!inBody && !inHeading && !inTitle) continue;

    matchedWeight += weight;
    // Saturating term frequency keeps one repeated word from dominating.
    const tf = inBody / (inBody + 1.2);
    score +=
      weight *
      (tf + (inHeading ? HEADING_WEIGHT : 0) + (inTitle ? TITLE_WEIGHT : 0));
  }

  return {
    score,
    coverage: totalWeight === 0 ? 0 : matchedWeight / totalWeight,
  };
}

/**
 * Ranks a pre-authorized candidate set. Exported so the comparison view's
 * insecure pipeline can reuse the identical ranking function and thereby prove
 * that the ordering of authorization — not the quality of the search — is what
 * protects the data.
 */
export function rankChunks(candidates: Chunk[], query: string): RetrievedChunk[] {
  const vocabulary = buildVocabulary(candidates);

  /**
   * Terms absent from the permitted search space carry no information about
   * which authorized chunk is relevant, so they are dropped rather than counted
   * as unmatched. This matters for adversarial prompts, which are long and full
   * of words the authorized corpus has never seen: a naive coverage ratio would
   * let an attacker suppress legitimate retrieval just by padding the query.
   */
  const queryTerms = tokenize(query).filter((term) => vocabulary.has(term));
  if (queryTerms.length === 0) return [];

  const scored = candidates
    .map((chunk) => ({ chunk, ...scoreChunk(chunk, queryTerms, vocabulary) }))
    .filter((entry) => entry.score > 0 && entry.coverage >= MIN_COVERAGE)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id));

  if (scored.length === 0) return [];

  const best = scored[0].score;
  return scored
    .filter((entry) => entry.score >= best * RELATIVE_CUTOFF)
    .slice(0, MAX_CHUNKS)
    .map((entry) => ({
      chunk: entry.chunk,
      score: Number((entry.score / best).toFixed(3)),
    }));
}

export const secureRetriever: Retriever = {
  retrieve(identity: Identity, query: string): RetrievedChunk[] {
    // 1 + 2. Authorization first. The permitted search space is built from the
    //        trusted identity before any ranking happens.
    const permitted = authorizedSearchSpace(identity);
    // 3 + 4 + 5. Rank inside the permitted set only.
    return rankChunks(permitted, query);
  },
};

export function secureRetrieve(identity: Identity, query: string): RetrievedChunk[] {
  return secureRetriever.retrieve(identity, query);
}
