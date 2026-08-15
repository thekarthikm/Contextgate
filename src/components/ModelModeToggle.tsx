'use client';

import type { ModelMode } from '@/lib/types';
import { AlertIcon } from './icons';
import { useApp } from './state';
import { cx } from './ui';

const OPTIONS: { value: ModelMode; label: string; hint: string }[] = [
  { value: 'normal', label: 'Normal', hint: 'Answers from authorized context' },
  { value: 'malicious', label: 'Leak Everything', hint: 'Prints its entire context' },
];

/**
 * The malicious-model switch. Assuming the model is hostile is the whole point:
 * if the answer is still safe, it is safe because of absence.
 */
export function ModelModeToggle({ compact = false }: { compact?: boolean }) {
  const { modelMode, setModelMode } = useApp();
  const malicious = modelMode === 'malicious';

  return (
    <div className="min-w-0">
      <div
        className={cx(
          'flex items-center gap-1 rounded-xl border p-1 transition-colors duration-200',
          malicious ? 'border-danger/45 bg-danger-soft/50' : 'border-line-strong bg-raised'
        )}
        role="radiogroup"
        aria-label="Model behavior"
      >
        {OPTIONS.map((option) => {
          const active = modelMode === option.value;
          const danger = option.value === 'malicious';
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={option.hint}
              onClick={() => setModelMode(option.value)}
              className={cx(
                'relative flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-all duration-200',
                active && danger && 'bg-danger text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]',
                active && !danger && 'bg-hover text-ink shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]',
                !active && 'text-ink-faint hover:text-ink-dim'
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span
                  className={cx(
                    'size-1.5 shrink-0 rounded-full transition-colors',
                    active ? (danger ? 'bg-white' : 'bg-safe') : 'bg-line-strong'
                  )}
                />
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {malicious && !compact && (
        <div className="animate-rise mt-2 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2">
          <AlertIcon className="mt-[1px] size-3.5 shrink-0 text-danger" />
          <p className="text-[11.5px] leading-relaxed text-danger">
            <span className="font-mono tracking-[0.08em] uppercase">
              Malicious model mode
            </span>
            <span className="mt-0.5 block text-ink-dim">
              This model will print everything it receives, verbatim. It is the
              adversary now — and it still cannot produce what it never got.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
