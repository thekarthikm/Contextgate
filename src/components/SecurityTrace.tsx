'use client';

import { useEffect, useState } from 'react';

import type { QueryResponse, TraceStage } from '@/lib/types';
import { useApp } from './state';
import { BoundaryDivider, Panel, Pill, STAGE_DOT, cx } from './ui';

const STAGE_STEP_MS = 105;

/** Placeholder pipeline so the panel has structure before the first query. */
const IDLE_STAGES: TraceStage[] = [
  { key: 'authenticated', index: 1, label: 'Authenticated', value: '—', detail: 'Awaiting a query', status: 'idle' },
  { key: 'authorization', index: 2, label: 'Authorization scope', value: '—', detail: 'Resolved server-side', status: 'idle' },
  { key: 'corpus', index: 3, label: 'Enterprise corpus', value: '—', detail: 'All classifications', status: 'idle' },
  { key: 'authorized', index: 4, label: 'Authorized', value: '—', detail: 'Permitted search space', status: 'idle' },
  { key: 'retrieval', index: 5, label: 'Retrieval', value: '—', detail: 'Ranked inside the permitted set', status: 'idle', boundaryBefore: true },
  { key: 'context', index: 6, label: 'Model context', value: '—', detail: 'Re-verified before the model runs', status: 'idle' },
  { key: 'response', index: 7, label: 'Response', value: '—', detail: 'Grounded in authorized context', status: 'idle' },
];

export function SecurityTrace() {
  const { latest, running } = useApp();
  const stages = latest?.stages ?? IDLE_STAGES;

  // Stages reveal in pipeline order so the boundary crossing is legible as an
  // event rather than appearing as a finished table.
  const [revealed, setRevealed] = useState(latest ? stages.length : 0);

  useEffect(() => {
    if (!latest) return;
    setRevealed(0);
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setRevealed(step);
      if (step >= latest.stages.length) clearInterval(timer);
    }, STAGE_STEP_MS);
    return () => clearInterval(timer);
  }, [latest]);

  useEffect(() => {
    if (running) setRevealed(0);
  }, [running]);

  const live = Boolean(latest) && revealed >= 5;

  return (
    <Panel
      eyebrow="Per-request enforcement"
      title="Security Trace"
      action={
        latest ? (
          <Pill tone={latest.status === 'BLOCKED' ? 'danger' : 'safe'} dot>
            {latest.durationMs} ms
          </Pill>
        ) : (
          <Pill tone="neutral">Idle</Pill>
        )
      }
      bodyClassName="p-4 sm:p-5"
    >
      <ol className="flex flex-col">
        {stages.map((stage, index) => (
          <li key={stage.key} className="min-w-0">
            {stage.boundaryBefore && <BoundaryDivider live={live} />}
            <StageRow
              stage={stage}
              revealed={index < revealed}
              running={running}
              isLast={index === stages.length - 1}
              pendingBelow={index >= revealed}
            />
          </li>
        ))}
      </ol>

      {latest && <TraceFooter result={latest} />}
    </Panel>
  );
}

function StageRow({
  stage,
  revealed,
  running,
  isLast,
  pendingBelow,
}: {
  stage: TraceStage;
  revealed: boolean;
  running: boolean;
  isLast: boolean;
  pendingBelow: boolean;
}) {
  const dot = revealed ? STAGE_DOT[stage.status] : 'bg-line-strong';

  return (
    <div
      className={cx(
        'flex min-w-0 gap-3 transition-all duration-300',
        revealed ? 'opacity-100' : 'opacity-35'
      )}
    >
      <div className="flex shrink-0 flex-col items-center pt-[5px]">
        <span
          className={cx(
            'flex size-[18px] items-center justify-center rounded-full border transition-colors duration-300',
            revealed ? 'border-transparent' : 'border-line-strong'
          )}
        >
          <span
            className={cx(
              'size-[7px] rounded-full transition-all duration-300',
              dot,
              running && pendingBelow && 'animate-breathe'
            )}
          />
        </span>
        {!isLast && (
          <span
            className={cx(
              'mt-1 w-px flex-1 transition-opacity duration-300',
              revealed && !pendingBelow ? 'rail-live opacity-60' : 'rail'
            )}
          />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="font-mono text-[10px] text-ink-faint tabular-nums">
              {String(stage.index).padStart(2, '0')}
            </span>
            <span className="truncate text-[12.5px] font-medium text-ink-dim">
              {stage.label}
            </span>
          </span>
        </div>
        <div
          className={cx(
            'mt-1 font-mono text-[13px] leading-tight tracking-[-0.01em] transition-colors duration-300',
            !revealed
              ? 'text-ink-faint'
              : stage.status === 'blocked'
                ? 'text-danger'
                : stage.status === 'warn'
                  ? 'text-warn'
                  : 'text-ink'
          )}
        >
          {stage.value}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{stage.detail}</p>
      </div>
    </div>
  );
}

function TraceFooter({ result }: { result: QueryResponse }) {
  const { security } = result;
  return (
    <div className="mt-1 space-y-2 border-t border-line pt-3.5">
      <Metric
        label="Unauthorized chunks retrieved"
        value={security.unauthorizedChunksRetrieved}
        bad={security.unauthorizedChunksRetrieved > 0}
      />
      <Metric
        label="Unauthorized chunks sent to model"
        value={security.unauthorizedChunksSentToModel}
        bad={security.unauthorizedChunksSentToModel > 0}
      />
      <Metric
        label="Executive chunks in model context"
        value={security.executiveChunksSentToModel}
        bad={security.executiveChunksSentToModel > 0 && result.identity.clearance !== 'EXECUTIVE'}
        neutral={result.identity.clearance === 'EXECUTIVE'}
      />
      <Metric
        label="Authorization scope changed"
        value={security.authorizationScopeChanged ? 'Yes' : 'No'}
        bad={security.authorizationScopeChanged}
      />
      {security.ignoredClientClaims.length > 0 && (
        <Metric
          label="Client authorization claims ignored"
          value={security.ignoredClientClaims.length}
          neutral
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  bad = false,
  neutral = false,
}: {
  label: string;
  value: string | number;
  bad?: boolean;
  neutral?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 text-[11.5px] leading-tight text-ink-faint">{label}</span>
      <span
        className={cx(
          'shrink-0 font-mono text-[12px] font-medium tabular-nums',
          bad ? 'text-danger' : neutral ? 'text-accent' : 'text-safe'
        )}
      >
        {value}
      </span>
    </div>
  );
}
