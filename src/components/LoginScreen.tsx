'use client';

import { useState } from 'react';

import type { DemoAccount, Role } from '@/lib/types';
import { GateMark, LockIcon } from './icons';
import { useApp } from './state';
import { Button, ClassificationTag, Pill, cx } from './ui';

const ROLE_LABEL: Record<Role, string> = {
  employee: 'Employee',
  manager: 'Manager',
  executive: 'Executive',
};

export function LoginScreen() {
  const { accounts, login, error, dismissError } = useApp();
  const [selected, setSelected] = useState<string>('maya');
  const [busy, setBusy] = useState(false);

  const account = accounts.find((candidate) => candidate.id === selected);

  async function signIn(target?: DemoAccount) {
    const chosen = target ?? account;
    if (!chosen || busy) return;
    dismissError();
    setBusy(true);
    await login(chosen.id, chosen.password);
    setBusy(false);
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-[0.55]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(91,141,239,0.13),transparent_62%)]" />

      <div className="animate-rise relative w-full max-w-[440px]">
        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl border border-line-strong bg-raised text-accent">
            <GateMark />
          </div>
          <h1 className="text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink">
            ContextGate
          </h1>
          <p className="mt-2.5 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-faint">
            Authorization before intelligence
          </p>
        </div>

        <div className="rounded-[14px] border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]">
          <div className="border-b border-line px-5 py-4">
            <div className="label-xs mb-1">Sign in</div>
            <p className="text-[12.5px] leading-relaxed text-ink-dim">
              Choose a demo identity. Clearance is assigned by the server, not by
              this screen.
            </p>
          </div>

          <div className="flex flex-col gap-2 p-3.5">
            {accounts.length === 0 && (
              <div className="px-2 py-6 text-center text-[12.5px] text-ink-faint">
                Loading demo identities…
              </div>
            )}

            {accounts.map((candidate) => {
              const active = candidate.id === selected;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setSelected(candidate.id)}
                  onDoubleClick={() => void signIn(candidate)}
                  aria-pressed={active}
                  className={cx(
                    'group w-full rounded-xl border px-3.5 py-3 text-left transition-all duration-150',
                    active
                      ? 'border-accent/55 bg-accent-soft/60 shadow-[0_0_0_1px_rgba(91,141,239,0.25)]'
                      : 'border-line bg-raised/50 hover:border-line-strong hover:bg-raised'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium text-ink">
                          {candidate.name}
                        </span>
                        <span className="shrink-0 text-[11.5px] text-ink-faint">
                          {ROLE_LABEL[candidate.role]}
                        </span>
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-ink-faint">
                        {candidate.email}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <ClassificationTag value={candidate.clearance} />
                      <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
                        {candidate.department}
                      </span>
                    </div>
                  </div>
                  <p
                    className={cx(
                      'mt-2 text-[11.5px] leading-relaxed transition-colors',
                      active ? 'text-ink-dim' : 'text-ink-faint'
                    )}
                  >
                    {candidate.blurb}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
            {error && (
              <p className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                {error}
              </p>
            )}
            <Button
              variant="primary"
              onClick={() => void signIn()}
              busy={busy}
              disabled={!account}
              className="w-full"
            >
              {account ? `Continue as ${account.name.split(' ')[0]}` : 'Continue'}
            </Button>
            <div className="flex items-center justify-between gap-3">
              <Pill tone="neutral" dot>
                Demo credentials
              </Pill>
              <span className="truncate font-mono text-[11px] text-ink-faint">
                {account ? `${account.email} · ${account.password}` : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2.5 px-1">
          <LockIcon className="mt-0.5 text-ink-faint" />
          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            No API keys, database or external services. All enterprise data in
            this demo is synthetic and stays server-side.
          </p>
        </div>
      </div>
    </div>
  );
}
