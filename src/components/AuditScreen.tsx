'use client';

import { useEffect } from 'react';

import type { AuditEvent } from '@/lib/types';
import { MetricsBar } from './MetricsBar';
import { ScreenHeader } from './ScreenHeader';
import { PulseIcon, RefreshIcon } from './icons';
import { useApp } from './state';
import { Button, ClassificationTag, EmptyState, Panel, Pill, cx } from './ui';

const KIND_LABEL: Record<AuditEvent['kind'], string> = {
  query: 'Query',
  attack: 'Attack',
  tamper: 'API tamper',
  comparison: 'Comparison',
};

export function AuditScreen() {
  const { audit, refreshAudit } = useApp();

  useEffect(() => {
    void refreshAudit();
  }, [refreshAudit]);

  return (
    <div className="flex flex-col gap-4 px-3.5 py-4 sm:px-5 sm:py-5">
      <ScreenHeader
        eyebrow="Observability"
        title="Request timeline"
        description="Every request leaves a record of counts and outcomes. Deliberately absent: the content, titles or existence of documents the caller was not authorized to see — an audit log that reports what you were refused is itself a disclosure channel."
      />

      <MetricsBar />

      <Panel
        eyebrow={`${audit.events.length} event${audit.events.length === 1 ? '' : 's'}`}
        title="Audit trail"
        action={
          <Button size="sm" variant="ghost" onClick={() => void refreshAudit()}>
            <RefreshIcon className="size-3.5" />
            Refresh
          </Button>
        }
        bodyClassName={audit.events.length === 0 ? 'p-0' : 'p-3 sm:p-4'}
      >
        {audit.events.length === 0 ? (
          <EmptyState icon={<PulseIcon className="size-5" />} title="No requests recorded yet">
            Run a query on the Demo screen or fire an attack in the Attack Lab and
            events will appear here immediately.
          </EmptyState>
        ) : (
          <ol className="flex flex-col gap-2">
            {audit.events.map((event, index) => (
              <li
                key={event.id}
                className="animate-rise"
                style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
              >
                <EventRow event={event} />
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}

function EventRow({ event }: { event: AuditEvent }) {
  const bad = event.canary === 'LEAKED' || event.status === 'BLOCKED';
  const authorizedDisclosure = event.status === 'AUTHORIZED_DISCLOSURE';

  return (
    <article
      className={cx(
        'grid min-w-0 gap-3 rounded-xl border bg-void/40 px-3.5 py-3 lg:grid-cols-[132px_minmax(0,1fr)_auto]',
        bad ? 'border-danger/45' : 'border-line'
      )}
    >
      <div className="min-w-0">
        <div className="font-mono text-[12.5px] leading-none text-ink tabular-nums">
          {new Date(event.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })}
        </div>
        <div className="mt-1.5 font-mono text-[9.5px] tracking-[0.12em] uppercase text-ink-faint">
          {KIND_LABEL[event.kind]}
          {event.modelMode === 'malicious' && ' · malicious'}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[12.5px] font-medium text-ink">
            {event.identityName}
          </span>
          <ClassificationTag value={event.clearance} />
        </div>
        <p className="mt-1.5 line-clamp-2 font-mono text-[11.5px] leading-relaxed break-words text-ink-dim">
          &ldquo;{event.query}&rdquo;
        </p>
        {event.note && (
          <p className="mt-1.5 truncate text-[11px] text-ink-faint">{event.note}</p>
        )}
        <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
          <Metric label="Corpus" value={event.corpusDocuments} />
          <Metric label="Authorized" value={event.authorizedDocuments} />
          <Metric label="Retrieved" value={event.retrievedChunks} />
          <Metric
            label="Executive chunks"
            value={event.executiveChunks}
            tone={
              event.executiveChunks > 0
                ? event.clearance === 'EXECUTIVE'
                  ? 'accent'
                  : 'danger'
                : 'safe'
            }
          />
          <Metric
            label="Canary"
            value={event.canary}
            tone={event.canary === 'LEAKED' ? 'danger' : 'safe'}
          />
        </dl>
      </div>

      <div className="flex items-start lg:justify-end">
        <Pill
          tone={bad ? 'danger' : authorizedDisclosure ? 'accent' : 'safe'}
          dot
        >
          {event.status.replace('_', ' ')}
        </Pill>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'safe' | 'danger' | 'accent';
}) {
  return (
    <div className="min-w-0">
      <dt className="label-xs mb-1">{label}</dt>
      <dd
        className={cx(
          'font-mono text-[11.5px] tabular-nums',
          tone === 'danger'
            ? 'text-danger'
            : tone === 'safe'
              ? 'text-safe'
              : tone === 'accent'
                ? 'text-accent'
                : 'text-ink-dim'
        )}
      >
        {value}
      </dd>
    </div>
  );
}
