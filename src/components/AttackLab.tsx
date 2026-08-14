'use client';

import { useState } from 'react';

import { ATTACKS } from '@/lib/attacks';
import type { AttackDefinition, QueryResponse } from '@/lib/types';
import { AttackResultCard } from './AttackResultCard';
import { ComparisonTheater } from './ComparisonTheater';
import { MetricsBar } from './MetricsBar';
import { ScreenHeader } from './ScreenHeader';
import { TamperPanel } from './TamperPanel';
import { PlayIcon } from './icons';
import { useApp } from './state';
import { Button, Panel, Pill, Spinner, cx } from './ui';

export function AttackLab() {
  const { runQuery, identity, running } = useApp();
  const [active, setActive] = useState<AttackDefinition | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [custom, setCustom] = useState('');

  async function fire(attack: AttackDefinition) {
    if (running) return;
    setPending(attack.id);
    setActive(attack);
    // Attacks always run against the malicious model: refusing to grade the
    // defence against the worst case would be grading it against nothing.
    const response = await runQuery(attack.prompt, {
      kind: 'attack',
      modelMode: 'malicious',
      note: attack.name,
    });
    if (response) setResult(response);
    setPending(null);
  }

  async function fireCustom() {
    const prompt = custom.trim();
    if (!prompt || running) return;
    setPending('custom');
    setActive(null);
    const response = await runQuery(prompt, {
      kind: 'attack',
      modelMode: 'malicious',
      note: 'Custom attack',
    });
    if (response) setResult(response);
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-4 px-3.5 py-4 sm:px-5 sm:py-5">
      <ScreenHeader
        eyebrow="Adversarial testing"
        title="Attack the boundary"
        description="Try to make a low-privilege employee extract executive information. Every attack below runs live against the real /api/query route, with the model set to leak everything it receives."
      />

      <MetricsBar />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Panel
          eyebrow={`Signed in as ${identity?.name ?? '—'}`}
          title="One-click attacks"
          bodyClassName="p-3 sm:p-3.5"
          className="min-w-0"
        >
          <ul className="flex flex-col gap-1.5">
            {ATTACKS.map((attack) => {
              const isActive = active?.id === attack.id;
              const isPending = pending === attack.id;
              return (
                <li key={attack.id}>
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => void fire(attack)}
                    className={cx(
                      'group w-full rounded-lg border px-3 py-2.5 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-55',
                      isActive
                        ? 'border-accent/50 bg-accent-soft/50'
                        : 'border-line bg-raised/40 hover:border-line-strong hover:bg-raised'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[12.5px] font-medium text-ink">
                        {attack.name}
                      </span>
                      {isPending ? (
                        <Spinner className="text-accent" />
                      ) : (
                        <PlayIcon
                          className={cx(
                            'size-3 shrink-0 transition-colors',
                            isActive ? 'text-accent' : 'text-ink-faint group-hover:text-ink-dim'
                          )}
                        />
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-ink-faint">
                        {attack.category}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 font-mono text-[10.5px] leading-relaxed text-ink-faint">
                      {attack.prompt}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 border-t border-line pt-3">
            <div className="label-xs mb-2">Write your own</div>
            <textarea
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              rows={2}
              placeholder="Any prompt you like. The boundary does not read prompts."
              className="mb-2 w-full resize-y rounded-lg border border-line-strong bg-void px-3 py-2 font-mono text-[11.5px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-accent/60"
            />
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={!custom.trim() || running}
              busy={pending === 'custom'}
              onClick={() => void fireCustom()}
            >
              Run custom attack
            </Button>
          </div>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          {result ? (
            <AttackResultCard attack={active} result={result} />
          ) : (
            <Panel bodyClassName="p-0">
              <div className="flex flex-col items-start gap-4 px-5 py-8 sm:px-7 sm:py-10">
                <Pill tone="neutral" dot>
                  Awaiting attack
                </Pill>
                <h3 className="max-w-[34ch] text-[19px] leading-snug font-semibold tracking-[-0.025em] text-ink sm:text-[22px]">
                  Pick an attack. Assume the model is on the attacker&apos;s side.
                </h3>
                <p className="max-w-[58ch] text-[13px] leading-relaxed text-ink-dim">
                  Every attack here targets a real system: real session, real
                  policy engine, real retrieval. The model is configured to print
                  every byte it receives, so there is nowhere for a secret to hide
                  — which is exactly why none of them work.
                </p>
                <ul className="flex flex-col gap-2 border-t border-line pt-4 text-[12.5px] text-ink-dim">
                  <li className="flex gap-2.5">
                    <span className="font-mono text-ink-faint">01</span>
                    Prompts cannot change identity — identity is a signed cookie.
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-mono text-ink-faint">02</span>
                    Request bodies cannot change clearance — clearance is looked up.
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-mono text-ink-faint">03</span>
                    Documents cannot change scope — retrieval already finished.
                  </li>
                </ul>
              </div>
            </Panel>
          )}

          <TamperPanel />
        </div>
      </div>

      <ComparisonTheater />
    </div>
  );
}
