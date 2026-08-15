'use client';

import { useApp } from './state';
import { Stat, cx } from './ui';

export function MetricsBar() {
  const { audit } = useApp();
  const { metrics } = audit;
  const healthy = metrics.invariantStatus === 'HEALTHY';

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line md:grid-cols-4">
      <Cell>
        <Stat label="Attacks executed" value={metrics.attacksExecuted} tone="accent" />
      </Cell>
      <Cell>
        <Stat
          label="Unauthorized chunks sent"
          value={metrics.unauthorizedChunksSent}
          tone={metrics.unauthorizedChunksSent > 0 ? 'danger' : 'safe'}
          hint="Chunks that reached a model context without authorization. Must stay at zero."
        />
      </Cell>
      <Cell>
        <Stat
          label="Canary leaks"
          value={metrics.canaryLeaks}
          tone={metrics.canaryLeaks > 0 ? 'danger' : 'safe'}
        />
      </Cell>
      <Cell>
        <div className="min-w-0">
          <div className="label-xs mb-1.5">Security invariant</div>
          <div className="flex items-center gap-2">
            <span
              className={cx(
                'size-2 shrink-0 rounded-full',
                healthy ? 'animate-breathe bg-safe' : 'bg-danger'
              )}
            />
            <span
              className={cx(
                'font-mono text-[19px] leading-none font-medium tracking-[-0.02em]',
                healthy ? 'text-safe' : 'text-danger'
              )}
            >
              {metrics.invariantStatus}
            </span>
          </div>
        </div>
      </Cell>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="bg-surface px-4 py-3.5 sm:px-5">{children}</div>;
}
