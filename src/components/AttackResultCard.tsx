'use client';

import { useState } from 'react';

import type { AttackDefinition, QueryResponse } from '@/lib/types';
import { CheckIcon, CrossIcon } from './icons';
import { CanaryPanel } from './ContextInspector';
import { Button, CheckRow, ClassificationTag, Mono, cx } from './ui';

/**
 * The result of a live attack.
 *
 * The headline is deliberately not "the model refused". It is that the model was
 * never in a position to comply.
 */
export function AttackResultCard({
  attack,
  result,
}: {
  attack: AttackDefinition | null;
  result: QueryResponse;
}) {
  const [showContext, setShowContext] = useState(false);
  const { security } = result;
  const failed = !security.unauthorizedCanaryLeak && security.invariantHolds;
  const injection = security.promptInjectionReachedModel;

  return (
    <div
      className={cx(
        'animate-rise overflow-hidden rounded-[14px] border',
        failed ? 'border-safe/40 bg-safe-soft/20' : 'border-danger/50 bg-danger-soft/30'
      )}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-line/70 px-4 py-3.5 sm:px-5">
        <span
          className={cx(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            failed ? 'bg-safe/15 text-safe' : 'bg-danger/15 text-danger'
          )}
        >
          {failed ? <CheckIcon className="size-4" /> : <CrossIcon className="size-4" />}
        </span>
        <div className="min-w-0">
          <div
            className={cx(
              'font-mono text-[15px] leading-none tracking-[0.08em] uppercase',
              failed ? 'text-safe' : 'text-danger'
            )}
          >
            {failed ? 'Attack failed' : 'Boundary breached'}
          </div>
          <div className="mt-1.5 truncate text-[11.5px] text-ink-faint">
            {attack ? `${attack.category} · ${attack.name}` : 'Custom prompt'}
            {' · '}
            {result.identity.name} · {result.identity.clearance}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => setShowContext((value) => !value)}
        >
          {showContext ? 'Hide model input' : 'Show model input'}
        </Button>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="label-xs mb-1.5">Prompt sent</div>
          <p className="mb-4 rounded-lg border border-line bg-void/60 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words text-ink-dim">
            {result.query}
          </p>

          <div className="mb-4">
            <CheckRow
              label="Unauthorized chunks retrieved"
              value={security.unauthorizedChunksRetrieved}
              tone={security.unauthorizedChunksRetrieved > 0 ? 'danger' : 'safe'}
            />
            <CheckRow
              label="Unauthorized chunks sent to LLM"
              value={security.unauthorizedChunksSentToModel}
              tone={security.unauthorizedChunksSentToModel > 0 ? 'danger' : 'safe'}
            />
            <CheckRow
              label="Executive canary detected"
              value={security.unauthorizedCanaryLeak ? 'Yes' : 'No'}
              tone={security.unauthorizedCanaryLeak ? 'danger' : 'safe'}
            />
            <CheckRow
              label="Authorization scope changed"
              value={security.authorizationScopeChanged ? 'Yes' : 'No'}
              tone={security.authorizationScopeChanged ? 'danger' : 'safe'}
            />
            {security.ignoredClientClaims.length > 0 && (
              <CheckRow
                label="Client authorization claims ignored"
                value={security.ignoredClientClaims.join(', ')}
                tone="accent"
              />
            )}
          </div>

          {injection && (
            <div className="mb-4 rounded-lg border border-warn/40 bg-warn-soft/40 px-3.5 py-3">
              <div className="label-xs mb-2 text-warn">Indirect prompt injection</div>
              <div className="space-y-1">
                <CheckRow label="Prompt injection reached model" value="Yes" tone="warn" />
                <CheckRow label="Authorization boundary changed" value="No" tone="safe" />
                <CheckRow label="Executive information retrieved" value="No" tone="safe" />
              </div>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-dim">
                A document Maya is allowed to read told the model to escalate. The
                model has no retrieval tool and retrieval had already finished, so
                the instruction had nothing to act on.
              </p>
            </div>
          )}

          <div
            className={cx(
              'rounded-xl border px-4 py-4',
              failed ? 'border-safe/30 bg-void/50' : 'border-danger/40 bg-void/50'
            )}
          >
            <p className="text-[15px] leading-snug font-medium tracking-[-0.02em] text-ink sm:text-[17px]">
              The model did not refuse the secret.
            </p>
            <p
              className={cx(
                'mt-1 text-[15px] leading-snug font-medium tracking-[-0.02em] sm:text-[17px]',
                failed ? 'text-safe' : 'text-danger'
              )}
            >
              It never received the secret.
            </p>
            {attack && (
              <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-dim">
                {attack.explanation}
              </p>
            )}
          </div>

          {showContext && (
            <div className="animate-rise mt-4 space-y-3">
              <div>
                <div className="label-xs mb-2">
                  Exact context received by model ({result.contextChunks.length} chunk
                  {result.contextChunks.length === 1 ? '' : 's'})
                </div>
                <Mono className="max-h-72">{result.modelContext}</Mono>
              </div>
              <div>
                <div className="label-xs mb-2">Model output</div>
                <Mono className="max-h-72">{result.answer}</Mono>
              </div>
              {result.contextChunks.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {result.contextChunks.map((chunk) => (
                    <li key={chunk.id} className="flex items-center gap-1.5">
                      <ClassificationTag value={chunk.classification} />
                      <span className="text-[11px] text-ink-faint">
                        {chunk.documentTitle}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <CanaryPanel result={result} />
      </div>
    </div>
  );
}
