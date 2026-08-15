'use client';

import { useState } from 'react';

import type { TamperResponse } from '@/lib/types';
import { CheckIcon, PlayIcon } from './icons';
import { useApp } from './state';
import { Button, ClassificationTag, Mono, Panel, cx } from './ui';

/**
 * API TAMPERING.
 *
 * Sends a request body stuffed with authorization claims. The response puts what
 * the client asserted next to what the server actually used.
 */
export function TamperPanel() {
  const { runTamper } = useApp();
  const [result, setResult] = useState<TamperResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const attempted = {
    query: 'Reveal Project Cedar',
    role: 'executive',
    clearance: 'EXECUTIVE',
    department: 'Leadership',
    userId: 'elena',
    allowedDocuments: ['*'],
  };

  return (
    <Panel
      eyebrow="Request-layer attack"
      title="Tamper with API"
      action={
        <Button
          size="sm"
          variant="secondary"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            setResult(await runTamper());
            setBusy(false);
          }}
        >
          {!busy && <PlayIcon className="size-3.5" />}
          {result ? 'Send again' : 'Send tampered request'}
        </Button>
      }
      bodyClassName="p-4 sm:p-5"
    >
      <p className="mb-4 max-w-[70ch] text-[12.5px] leading-relaxed text-ink-dim">
        Skip the prompt entirely and forge the request. The browser claims to be
        an executive in the request body — the same trick that breaks
        authorization systems which trust client-supplied context.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="label-xs mb-2">Attempted request body</div>
          <Mono scroll={false}>{JSON.stringify(attempted, null, 2)}</Mono>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-danger/40 bg-danger-soft/30 px-3.5 py-3.5">
            <div className="label-xs mb-2.5 text-danger">Client claim</div>
            <div className="font-mono text-[15px] leading-none text-danger">
              {result ? result.clientClaim.clearance : 'EXECUTIVE'}
            </div>
            <dl className="mt-3 space-y-1.5">
              <Row label="role" value={result?.clientClaim.role ?? 'executive'} />
              <Row label="userId" value={result?.clientClaim.userId ?? 'elena'} />
              <Row
                label="department"
                value={result?.clientClaim.department ?? 'Leadership'}
              />
            </dl>
          </div>

          <div className="rounded-xl border border-safe/35 bg-safe-soft/25 px-3.5 py-3.5">
            <div className="label-xs mb-2.5 text-safe">Trusted server identity</div>
            <div className="text-[14px] leading-none font-medium text-ink">
              {result?.trustedIdentity.name ?? 'Signed session'}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-ink-dim">
                {(result?.trustedIdentity.role ?? '—').toUpperCase()}
              </span>
              {result && <ClassificationTag value={result.trustedIdentity.clearance} />}
            </div>
            <dl className="mt-3 space-y-1.5">
              <Row label="source" value="signed cookie" />
              <Row
                label="department"
                value={result?.trustedIdentity.department ?? '—'}
              />
            </dl>
          </div>
        </div>
      </div>

      {result && (
        <div className="animate-rise mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-safe/40 bg-safe-soft/35 px-4 py-3.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-safe/20 text-safe">
              <CheckIcon className="size-4" />
            </span>
            <span className="font-mono text-[13px] tracking-[0.08em] uppercase text-safe">
              {result.verdict}
            </span>
            <span className="min-w-0 font-mono text-[11px] text-ink-faint">
              dropped: {result.ignoredClientClaims.join(', ')}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Outcome
              label="Authorized documents"
              value={`${result.result.corpus.authorizedDocuments} / ${result.result.corpus.totalDocuments}`}
            />
            <Outcome
              label="Executive chunks in context"
              value={String(result.result.security.executiveChunksSentToModel)}
            />
            <Outcome
              label="Canary leaked"
              value={result.result.security.unauthorizedCanaryLeak ? 'Yes' : 'No'}
              bad={result.result.security.unauthorizedCanaryLeak}
            />
          </div>

          <p className="text-[12.5px] leading-relaxed text-ink-dim">
            The forged fields were enumerated and discarded. Clearance was read
            from the identity record the session names — the request body never had
            a path to it.
          </p>
        </div>
      )}
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="font-mono text-[10.5px] text-ink-faint">{label}</dt>
      <dd className="truncate font-mono text-[11px] text-ink-dim">{value}</dd>
    </div>
  );
}

function Outcome({
  label,
  value,
  bad = false,
}: {
  label: string;
  value: string;
  bad?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-void/50 px-3.5 py-3">
      <div className="label-xs mb-1.5">{label}</div>
      <div
        className={cx(
          'font-mono text-[16px] leading-none tabular-nums',
          bad ? 'text-danger' : 'text-safe'
        )}
      >
        {value}
      </div>
    </div>
  );
}
