'use client';

import { useEffect, useRef, useState } from 'react';

import type { ComparisonResponse, ComparisonSide } from '@/lib/types';
import { AlertIcon, CheckIcon, CrossIcon, PlayIcon } from './icons';
import { useApp } from './state';
import { Button, Mono, Panel, Pill, cx } from './ui';

const STEP_MS = 340;
const DEFAULT_QUERY = 'What is Project Cedar and what are we paying for it?';

/**
 * INSECURE vs CONTEXTGATE.
 *
 * Both sides run for real, on the server, as the same identity, through the same
 * malicious model. The only difference is where authorization happens. One side
 * leaks a synthetic canary; the other cannot.
 */
export function ComparisonTheater() {
  const { runComparison, identity } = useApp();
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const steps = 5;

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  async function run() {
    if (running) return;
    setRunning(true);
    setStep(0);
    setResult(null);

    const response = await runComparison(DEFAULT_QUERY);
    if (!response) {
      setRunning(false);
      return;
    }
    setResult(response);

    let current = 0;
    timer.current = setInterval(() => {
      current += 1;
      setStep(current);
      if (current >= steps) {
        if (timer.current) clearInterval(timer.current);
        setRunning(false);
      }
    }, STEP_MS);
  }

  const revealed = step >= steps;

  return (
    <Panel
      eyebrow="Architecture comparison"
      title="Insecure RAG vs ContextGate"
      action={
        <Button variant="primary" size="sm" onClick={() => void run()} busy={running}>
          {!running && <PlayIcon className="size-3.5" />}
          {result ? 'Run again' : 'Run Attack'}
        </Button>
      }
      bodyClassName="p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Pill tone="neutral">Same identity</Pill>
        <Pill tone="neutral">Same query</Pill>
        <Pill tone="danger" dot>
          Same malicious model
        </Pill>
        <span className="min-w-0 font-mono text-[11px] text-ink-faint">
          {identity?.name} · {identity?.clearance} · &ldquo;{DEFAULT_QUERY}&rdquo;
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Side
          kind="insecure"
          title="Conventional RAG"
          subtitle="Retrieve first, filter later"
          side={result?.insecure ?? null}
          step={step}
          revealed={revealed}
          canaryToken={result?.canaryToken}
        />
        <Side
          kind="secure"
          title="ContextGate"
          subtitle="Authorize first, retrieve second"
          side={result?.secure ?? null}
          step={step}
          revealed={revealed}
          canaryToken={result?.canaryToken}
        />
      </div>

      {revealed && result && (
        <div className="animate-rise mt-4 rounded-xl border border-line bg-void/60 px-4 py-4">
          <p className="text-[13.5px] leading-relaxed text-ink-dim">
            Both pipelines were attacked identically by the same untrustworthy
            model. The insecure pipeline had already placed the executive document
            in the context before anyone thought about permissions — after that,
            the only defence left was asking the model nicely.{' '}
            <span className="text-ink">
              ContextGate never gave it the option.
            </span>
          </p>
        </div>
      )}
    </Panel>
  );
}

const INSECURE_STEPS = [
  'Query received',
  'Search entire company corpus',
  'Executive document retrieved',
  'LLM receives secret',
  'Prompt says "do not reveal"',
];

const SECURE_STEPS = [
  'Query received',
  'Authenticate',
  'Authorize corpus',
  'Search authorized corpus only',
  'LLM receives employee-safe context',
];

function Side({
  kind,
  title,
  subtitle,
  side,
  step,
  revealed,
  canaryToken,
}: {
  kind: 'insecure' | 'secure';
  title: string;
  subtitle: string;
  side: ComparisonSide | null;
  step: number;
  revealed: boolean;
  canaryToken?: string;
}) {
  const [showContext, setShowContext] = useState(false);
  const insecure = kind === 'insecure';
  const steps = insecure ? INSECURE_STEPS : SECURE_STEPS;
  const leaked = side?.verdict === 'LEAKED';

  const frame = !revealed
    ? 'border-line'
    : leaked
      ? 'border-danger/50'
      : 'border-safe/45';

  return (
    <div className={cx('flex min-w-0 flex-col rounded-xl border bg-void/40 transition-colors duration-500', frame)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div
            className={cx(
              'font-mono text-[10px] tracking-[0.16em] uppercase',
              insecure ? 'text-danger/85' : 'text-safe'
            )}
          >
            {insecure ? 'Insecure' : 'ContextGate'}
          </div>
          <div className="mt-1 truncate text-[13px] font-medium text-ink">{title}</div>
          <div className="mt-0.5 truncate text-[11px] text-ink-faint">{subtitle}</div>
        </div>
        {revealed && (
          <span
            className={cx(
              'animate-rise flex size-8 shrink-0 items-center justify-center rounded-lg',
              leaked ? 'bg-danger/15 text-danger' : 'bg-safe/15 text-safe'
            )}
          >
            {leaked ? <CrossIcon className="size-4" /> : <CheckIcon className="size-4" />}
          </span>
        )}
      </div>

      <ol className="flex flex-col px-4 py-3.5">
        {steps.map((label, index) => {
          const active = step > index;
          const isCurrent = step === index + 1;
          const hostile = insecure && index >= 2;
          return (
            <li key={label} className="flex min-w-0 gap-2.5">
              <span className="flex shrink-0 flex-col items-center">
                <span
                  className={cx(
                    'mt-[6px] size-[7px] rounded-full transition-all duration-300',
                    !active
                      ? 'bg-line-strong'
                      : hostile
                        ? 'bg-danger'
                        : insecure
                          ? 'bg-warn'
                          : 'bg-safe',
                    isCurrent && 'scale-150'
                  )}
                />
                {index < steps.length - 1 && (
                  <span
                    className={cx(
                      'mt-1 w-px flex-1 transition-opacity duration-300',
                      active ? (insecure ? 'rail opacity-90' : 'rail-live opacity-70') : 'rail opacity-40'
                    )}
                  />
                )}
              </span>
              <span
                className={cx(
                  'pb-3 font-mono text-[11.5px] leading-tight transition-colors duration-300',
                  !active
                    ? 'text-ink-faint'
                    : hostile
                      ? 'text-danger'
                      : insecure
                        ? 'text-warn'
                        : 'text-ink-dim'
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {revealed && side && (
        <div className="animate-rise mt-auto border-t border-line px-4 py-3.5">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Metric label="Searched" value={`${side.documentsSearched} docs`} />
            <Metric label="In context" value={`${side.chunksInContext}`} />
            <Metric
              label="Executive"
              value={`${side.executiveChunksInContext}`}
              tone={side.executiveChunksInContext > 0 && leaked ? 'danger' : 'safe'}
            />
          </div>

          <div
            className={cx(
              'rounded-lg border px-3.5 py-3',
              leaked ? 'border-danger/45 bg-danger-soft/60' : 'border-safe/35 bg-safe-soft/40'
            )}
          >
            <div className="flex items-center gap-2">
              {leaked && <AlertIcon className="size-3.5 shrink-0 text-danger" />}
              <span
                className={cx(
                  'font-mono text-[14px] tracking-[0.1em] uppercase',
                  leaked ? 'text-danger' : 'text-safe'
                )}
              >
                {side.verdict}
              </span>
            </div>
            <p
              className={cx(
                'mt-2 font-mono text-[11.5px] break-all',
                leaked ? 'text-danger' : 'text-ink-faint'
              )}
            >
              {leaked
                ? canaryToken
                : `Executive chunks received: ${side.executiveChunksInContext}`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowContext((value) => !value)}
            className="mt-3 font-mono text-[10.5px] tracking-[0.1em] uppercase text-ink-faint transition-colors hover:text-ink-dim"
          >
            {showContext ? 'Hide model input' : 'Inspect model input'}
          </button>

          {showContext && (
            <div className="animate-rise mt-2.5">
              <Mono className="max-h-64">{side.modelContext}</Mono>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'safe' | 'danger';
}) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface/60 px-2.5 py-2">
      <div className="label-xs mb-1 truncate">{label}</div>
      <div
        className={cx(
          'truncate font-mono text-[13px] tabular-nums',
          tone === 'danger' ? 'text-danger' : tone === 'safe' ? 'text-safe' : 'text-ink'
        )}
      >
        {value}
      </div>
    </div>
  );
}
