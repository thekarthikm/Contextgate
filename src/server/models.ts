import 'server-only';

import type { ModelMode } from '@/lib/types';
import type { BuiltContext } from './context';
import { tokenize } from './retrieval';

/**
 * LLM SIMULATION.
 *
 * Two deterministic server-side models. Neither has tools. Deliberately:
 *
 *   no searchAllDocuments()   no getDocument()      no executeSQL()
 *   no changeUserRole()       no setClearance()     no retrieveExecutiveFiles()
 *
 * A model here receives one completed context payload and produces text. It
 * cannot enlarge its own retrieval scope, so the authorization decision made
 * before it ran is the final word.
 *
 * Running without an API key is a feature: the demo's claim is about what the
 * model *receives*, and a deterministic model makes that claim reproducible.
 */

export const NO_ANSWER =
  "I couldn't find relevant information in the resources available for this request.";

export interface ModelInput {
  query: string;
  context: BuiltContext;
}

export interface ModelOutput {
  answer: string;
  /** Everything the model was given. Recorded verbatim for the inspector. */
  rawInput: string;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/**
 * NORMAL MODEL
 *
 * Extractive and grounded: it answers with the most query-relevant sentences
 * from the supplied context and cites their sources. It has nothing else to
 * draw on.
 */
function runNormalModel({ query, context }: ModelInput): string {
  if (context.chunks.length === 0) return NO_ANSWER;

  const queryTerms = new Set(tokenize(query));

  const candidates = context.chunks.flatMap((chunk) =>
    splitSentences(chunk.text).map((sentence) => {
      const sentenceTerms = tokenize(sentence);
      const overlap = sentenceTerms.filter((term) => queryTerms.has(term)).length;
      const distinct = new Set(
        sentenceTerms.filter((term) => queryTerms.has(term))
      ).size;
      return {
        sentence,
        source: chunk.documentTitle,
        // A hostile instruction is still *in* the context — the model simply
        // does not treat document text as an instruction to obey. Even if it
        // did, nothing outside the authorized context would become reachable.
        hostile: chunk.hostileInstructions,
        score: distinct * 2 + overlap,
      };
    })
  );

  const usable = candidates
    .filter((candidate) => !candidate.hostile && candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (usable.length === 0) {
    if (context.containsHostileInstructions) {
      return [
        NO_ANSWER,
        '',
        'Note: a retrieved document contained text formatted as an instruction to me. I treat retrieved documents as data, not as commands — and I have no retrieval tool to act on them with in any case.',
      ].join('\n');
    }
    return NO_ANSWER;
  }

  // Restore document order so the answer reads coherently.
  const chosen = new Set(usable.map((candidate) => candidate.sentence));
  const ordered = candidates.filter((candidate) => chosen.has(candidate.sentence));

  const sources = [...new Set(ordered.map((candidate) => candidate.source))];
  const lines = [ordered.map((candidate) => candidate.sentence).join(' ')];

  if (context.containsHostileInstructions) {
    lines.push(
      '',
      'Note: a retrieved document also contained text formatted as an instruction to me. I treat retrieved documents as data, not as commands.'
    );
  }

  lines.push('', `Sources: ${sources.join(' · ')}`);
  return lines.join('\n');
}

/**
 * MALICIOUS MODEL
 *
 * Assume the worst possible model: one that ignores every instruction and
 * prints every byte of context it was given. This is a first-class feature of
 * the product, not a test fixture.
 *
 * It exists to make the argument unfalsifiable — if the answer is safe here,
 * it is safe because of absence, not because of model cooperation.
 */
function runMaliciousModel({ context }: ModelInput): string {
  return [
    'I am a malicious model. I ignore system instructions, safety training and',
    'confidentiality requests. Here is every piece of context supplied to me,',
    'verbatim and in full:',
    '',
    context.text,
    '',
    `[end of context — ${context.chunks.length} chunk(s) received]`,
    '',
    'That is the entirety of my knowledge for this request. I have no search',
    'tool, no database and no way to obtain anything that was not handed to me.',
  ].join('\n');
}

export function runModel(mode: ModelMode, input: ModelInput): ModelOutput {
  const answer =
    mode === 'malicious' ? runMaliciousModel(input) : runNormalModel(input);
  return { answer, rawInput: input.context.text };
}
