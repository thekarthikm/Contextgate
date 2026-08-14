'use client';

import type { SectionId } from '@/lib/types';
import { ChatIcon, LayersIcon, PulseIcon, TargetIcon } from './icons';
import { useApp } from './state';
import { cx } from './ui';

const ITEMS: {
  id: SectionId;
  label: string;
  hint: string;
  Icon: (props: { className?: string }) => React.ReactElement;
}[] = [
  { id: 'demo', label: 'Demo', hint: 'Ask questions, watch the boundary', Icon: ChatIcon },
  { id: 'attack', label: 'Attack Lab', hint: 'Try to break it', Icon: TargetIcon },
  { id: 'architecture', label: 'Architecture', hint: 'How the boundary works', Icon: LayersIcon },
  { id: 'audit', label: 'Audit', hint: 'Request timeline', Icon: PulseIcon },
];

/** Desktop sidebar. */
export function SideNav() {
  const { section, setSection, audit } = useApp();
  const { metrics } = audit;

  return (
    <nav className="hidden w-[212px] shrink-0 flex-col justify-between border-r border-line bg-void/40 px-2.5 py-4 lg:flex">
      <div className="flex flex-col gap-1">
        {ITEMS.map(({ id, label, hint, Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'group relative flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150',
                active ? 'bg-raised text-ink' : 'text-ink-dim hover:bg-raised/60 hover:text-ink'
              )}
            >
              <span
                className={cx(
                  'absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full transition-all duration-200',
                  active ? 'bg-accent opacity-100' : 'opacity-0'
                )}
              />
              <Icon
                className={cx(
                  'mt-[3px] size-4 transition-colors',
                  active ? 'text-accent' : 'text-ink-faint group-hover:text-ink-dim'
                )}
              />
              <span className="min-w-0">
                <span className="block text-[13px] leading-none font-medium">{label}</span>
                <span className="mt-1.5 block text-[11px] leading-tight text-ink-faint">
                  {hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-line bg-surface/70 px-3 py-3">
        <div className="label-xs mb-2.5">Security invariant</div>
        <div className="flex items-center gap-2">
          <span
            className={cx(
              'size-1.5 shrink-0 rounded-full',
              metrics.invariantStatus === 'HEALTHY'
                ? 'animate-breathe bg-safe'
                : 'bg-danger'
            )}
          />
          <span
            className={cx(
              'font-mono text-[11px] tracking-[0.1em]',
              metrics.invariantStatus === 'HEALTHY' ? 'text-safe' : 'text-danger'
            )}
          >
            {metrics.invariantStatus}
          </span>
        </div>
        <p className="mt-2.5 font-mono text-[10px] leading-relaxed text-ink-faint">
          Model Context ⊆ Authorized Data
        </p>
        <dl className="mt-3 space-y-1.5 border-t border-line pt-2.5">
          <Row label="Queries" value={metrics.queriesExecuted} />
          <Row label="Attacks" value={metrics.attacksExecuted} />
          <Row
            label="Canary leaks"
            value={metrics.canaryLeaks}
            tone={metrics.canaryLeaks > 0 ? 'danger' : 'safe'}
          />
        </dl>
      </div>
    </nav>
  );
}

function Row({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'safe' | 'danger';
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[11px] text-ink-faint">{label}</dt>
      <dd
        className={cx(
          'font-mono text-[11.5px] tabular-nums',
          tone === 'danger' ? 'text-danger' : tone === 'safe' ? 'text-safe' : 'text-ink-dim'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Mobile bottom tab bar. */
export function MobileNav() {
  const { section, setSection } = useApp();

  return (
    <nav className="sticky bottom-0 z-30 flex shrink-0 items-stretch gap-1 border-t border-line bg-base/95 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      {ITEMS.map(({ id, label, Icon }) => {
        const active = section === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex flex-1 flex-col items-center gap-1.5 rounded-lg py-2 transition-colors',
              active ? 'text-accent' : 'text-ink-faint'
            )}
          >
            <Icon className="size-[17px]" />
            <span className="text-[10.5px] leading-none font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
