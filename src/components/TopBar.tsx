'use client';

import { useEffect, useRef, useState } from 'react';

import type { Role } from '@/lib/types';
import { ChevronIcon, GateMark, RefreshIcon } from './icons';
import { useApp } from './state';
import { Button, ClassificationTag, cx } from './ui';

const ROLE_LABEL: Record<Role, string> = {
  employee: 'Employee',
  manager: 'Manager',
  executive: 'Executive',
};

export function TopBar() {
  const { identity, accounts, switchIdentity, resetDemo, logout } = useApp();
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!identity) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-base/85 px-3.5 backdrop-blur-md sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-raised text-accent">
          <GateMark className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <div className="text-[14px] leading-none font-semibold tracking-[-0.02em] text-ink">
            ContextGate
          </div>
          <div className="mt-1 hidden font-mono text-[9.5px] tracking-[0.16em] uppercase text-ink-faint sm:block">
            Authorization before intelligence
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            setResetting(true);
            await resetDemo();
            setResetting(false);
          }}
          busy={resetting}
          title="Clear counters, audit trail and query state; restore the default identity"
        >
          {!resetting && <RefreshIcon className="size-3.5" />}
          <span className="hidden sm:inline">Reset Demo</span>
        </Button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-haspopup="menu"
            className={cx(
              'flex h-9 items-center gap-2.5 rounded-lg border px-2.5 transition-colors',
              open
                ? 'border-accent/50 bg-accent-soft/60'
                : 'border-line-strong bg-raised hover:bg-hover'
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent/20 font-mono text-[10.5px] font-semibold text-accent">
              {identity.name
                .split(' ')
                .map((part) => part[0])
                .join('')}
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block truncate text-[12.5px] leading-none font-medium text-ink">
                {identity.name}
              </span>
              <span className="mt-1 block font-mono text-[9.5px] tracking-[0.12em] uppercase text-ink-faint">
                {ROLE_LABEL[identity.role]}
              </span>
            </span>
            <ClassificationTag value={identity.clearance} className="hidden md:inline-flex" />
            <ChevronIcon
              className={cx(
                'size-3.5 text-ink-faint transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="animate-rise absolute right-0 z-40 mt-2 w-[290px] overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
            >
              <div className="border-b border-line px-3.5 py-2.5">
                <div className="label-xs">Switch identity</div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-faint">
                  Re-authenticates with the server. The browser cannot change its
                  own clearance.
                </p>
              </div>
              <div className="p-1.5">
                {accounts.map((account) => {
                  const active = account.id === identity.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        void switchIdentity(account.id);
                      }}
                      className={cx(
                        'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                        active ? 'bg-accent-soft/60' : 'hover:bg-raised'
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium text-ink">
                          {account.name}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10.5px] text-ink-faint">
                          {account.department}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <ClassificationTag value={account.clearance} />
                        {active && (
                          <span className="size-1.5 rounded-full bg-accent" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-line p-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    void logout();
                  }}
                  className="w-full rounded-lg px-2.5 py-2 text-left text-[12.5px] text-ink-dim transition-colors hover:bg-raised hover:text-ink"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
