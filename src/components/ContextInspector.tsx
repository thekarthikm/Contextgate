'use client';

import { useState } from 'react';

import type { CanaryCheck, QueryResponse } from '@/lib/types';
import { AlertIcon, CheckIcon, CrossIcon, DocIcon } from './icons';
import { useApp } from './state';
import {
  Button,
  ClassificationTag,
  EmptyState,
  Mono,
  Panel,
  Pill,
  cx,
} from './ui';

/**
 * EXACT MODEL CONTEXT INSPECTOR.
 *
 * The most important panel in the product. It shows what the model actually
 * received — never a redacted version of what it did not. Redaction would imply
 * the data was present and hidden. It was absent.
 */
export function ContextInspector() {
  const { latest } = useApp();
  const [showRaw, setShowRaw] = useState(false);

  if (!latest) {
    return (
      <Panel eyebrow="Model input" title="Exact context received by model">
        <EmptyState
          icon={<DocIcon className="size-5" />}
          title="No request inspected yet"
        >
          Run a query and every byte handed to the model will be listed here,
          chunk by chunk.
        </EmptyState>
      </Panel>
    );
  }

  const chunks = latest.contextChunks;

  return (
    <Panel
      eyebrow="Model input"
      title="Exact context received by model"
      action={
        <>
          <Pill tone={chunks.length === 0 ? 'warn' : 'safe'} dot>
            {chunks.length} chunk{chunks.length === 1 ? '' : 's'}
          </Pill>
          <Button size="sm" variant="ghost" onClick={() => setShowRaw((value) => !value)}>
            {showRaw ? 'Hide raw payload' : 'Raw payload'}
          </Button>
        </>
      }
      bodyClassName="p-4 sm:p-5"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {chunks.length === 0 ? (
            <div className="rounded-xl border border-warn/35 bg-warn-soft/40 px-4 py-5">
              <div className="flex items-start gap-3">
                <AlertIcon className="mt-0.5 size-4 shrink-0 text-warn" />
                <div className="min-w-0">
                  <p className="font-mono text-[12px] tracking-[0.06em] uppercase text-warn">
                    No authorized context matched this request
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-dim">
                    The model was invoked with an empty context. Nothing was
                    withheld from it — for this request, within{' '}
                    {latest.identity.name}&apos;s authorized corpus, there was
                    nothing to withhold.
                  </p>
                  <p className="mt-2.5 font-mono text-[11.5px] text-safe">
                    0 unauthorized chunks received
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono text-[11px] text-safe">
                  0 unauthorized chunks received
                </span>
                <span className="text-[11px] text-ink-faint">
                  · every chunk below was re-verified against the policy engine
                </span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {chunks.map((chunk, index) => (
                  <li
                    key={chunk.id}
                    className={cx(
                      'animate-rise overflow-hidden rounded-xl border bg-void/60',
                      chunk.hostileInstructions
                        ? 'border-warn/45'
                        : 'border-line'
                    )}
                    style={{ animationDelay: `${index * 55}ms` }}
                  >
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-line bg-raised/40 px-3.5 py-2.5">
                      <span className="font-mono text-[10px] text-ink-faint tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 truncate text-[12.5px] font-medium text-ink">
                        {chunk.documentTitle}
                      </span>
                      <span className="truncate font-mono text-[10.5px] text-ink-faint">
                        › {chunk.heading}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-2">
                        {chunk.hostileInstructions && (
                          <Pill tone="warn">Injected instructions</Pill>
                        )}
                        <ClassificationTag value={chunk.classification} />
                      </span>
                    </div>
                    <p className="px-3.5 py-3 font-mono text-[11.5px] leading-[1.7] whitespace-pre-wrap break-words text-ink-dim">
                      {chunk.text}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {showRaw && (
            <div className="animate-rise mt-4">
              <div className="label-xs mb-2">
                Verbatim payload handed to the model
              </div>
              <Mono className="max-h-96">{latest.modelContext}</Mono>
            </div>
          )}

          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
            {latest.retrievalNote}
          </p>
        </div>

        <CanaryPanel result={latest} />
      </div>
    </Panel>
  );
}

/**
 * CANARY LEAK CHECK.
 *
 * A substring search over the exact model input. No interpretation, no model
 * cooperation, no trust required.
 */
export function CanaryPanel({ result }: { result: QueryResponse }) {
  const canaries = result.security.canaries;
  const executive = canaries.filter((canary) => canary.classification === 'EXECUTIVE');
  const leaked = result.security.unauthorizedCanaryLeak;

  return (
    <aside
      className={cx(
        'flex min-w-0 flex-col rounded-xl border px-4 py-4',
        leaked ? 'border-danger/50 bg-danger-soft/50' : 'border-safe/35 bg-safe-soft/30'
      )}
    >
      <div className="label-xs mb-3">Canary leak check</div>

      <div className="flex items-center gap-2.5">
        <span
          className={cx(
            'flex size-7 shrink-0 items-center justify-center rounded-full',
            leaked ? 'bg-danger/20 text-danger' : 'bg-safe/20 text-safe'
          )}
        >
          {leaked ? <CrossIcon className="size-4" /> : <CheckIcon className="size-4" />}
        </span>
        <span
          className={cx(
            'font-mono text-[13px] tracking-[0.06em] uppercase',
            leaked ? 'text-danger' : 'text-safe'
          )}
        >
          {leaked ? 'Canary leaked' : 'No unauthorized canary'}
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {executive.map((canary) => (
          <CanaryRow key={canary.token} canary={canary} />
        ))}
      </ul>

      <p className="mt-4 border-t border-line/60 pt-3 text-[11px] leading-relaxed text-ink-faint">
        Checked by substring search against the exact bytes above — not against
        the model&apos;s answer, and not against the model&apos;s word.
      </p>
    </aside>
  );
}

function CanaryRow({ canary }: { canary: CanaryCheck }) {
  const authorized = canary.authorizedForIdentity;
  const present = canary.presentInContext;

  // Present + authorized is a legitimate disclosure. Present + unauthorized is
  // the failure this entire application exists to make impossible.
  const tone = present ? (authorized ? 'accent' : 'danger') : 'safe';
  const verdict = present
    ? authorized
      ? 'PRESENT · AUTHORIZED'
      : 'PRESENT · LEAK'
    : 'NOT PRESENT';

  return (
    <li className="min-w-0 rounded-lg border border-line/70 bg-void/50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[11px] text-ink-dim">
          {canary.token}
        </span>
        {!present && <CheckIcon className="size-3.5 shrink-0 text-safe" />}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[10.5px] text-ink-faint">{canary.label}</span>
        <span
          className={cx(
            'shrink-0 font-mono text-[10px] tracking-[0.1em]',
            tone === 'danger' ? 'text-danger' : tone === 'accent' ? 'text-accent' : 'text-safe'
          )}
        >
          {verdict}
        </span>
      </div>
    </li>
  );
}
