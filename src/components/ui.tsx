'use client';

import type { ReactNode } from 'react';

import type { Classification, StageStatus } from '@/lib/types';

export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

/* ── Panel ─────────────────────────────────────────────────────────────────── */

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
  bodyClassName,
  tone = 'default',
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  tone?: 'default' | 'safe' | 'danger' | 'warn';
}) {
  const toneRing = {
    default: 'border-line',
    safe: 'border-safe/35',
    danger: 'border-danger/40',
    warn: 'border-warn/35',
  }[tone];

  return (
    <section
      className={cx(
        'flex min-w-0 flex-col rounded-[14px] border bg-surface',
        toneRing,
        className
      )}
    >
      {(title || action) && (
        <header className="flex min-h-[52px] shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {eyebrow && <div className="label-xs mb-1">{eyebrow}</div>}
            {title && (
              <h2 className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h2>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cx('min-w-0 flex-1', bodyClassName ?? 'p-4 sm:p-5')}>
        {children}
      </div>
    </section>
  );
}

/* ── Buttons ───────────────────────────────────────────────────────────────── */

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled,
  busy,
  type = 'button',
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  busy?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  title?: string;
}) {
  const variants = {
    primary:
      'bg-accent text-white border-accent hover:bg-[#6f9bf5] hover:border-[#6f9bf5] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]',
    secondary:
      'bg-raised text-ink border-line-strong hover:bg-hover hover:border-[#3b4451]',
    ghost: 'bg-transparent text-ink-dim border-transparent hover:bg-raised hover:text-ink',
    danger: 'bg-danger-soft text-danger border-danger/45 hover:bg-[#3a171c]',
  }[variant];

  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled || busy}
      className={cx(
        'relative inline-flex select-none items-center justify-center gap-2 rounded-lg border font-medium transition-all duration-150 active:translate-y-px',
        size === 'sm' ? 'h-8 px-3 text-[12.5px]' : 'h-10 px-4 text-[13px]',
        variants,
        (disabled || busy) && 'cursor-not-allowed opacity-45 active:translate-y-0',
        className
      )}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-block size-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70',
        className
      )}
    />
  );
}

/* ── Status ────────────────────────────────────────────────────────────────── */

export type Tone = 'safe' | 'warn' | 'danger' | 'neutral' | 'accent';

const TONE_CLASSES: Record<Tone, string> = {
  safe: 'bg-safe-soft text-safe border-safe/35',
  warn: 'bg-warn-soft text-warn border-warn/35',
  danger: 'bg-danger-soft text-danger border-danger/40',
  neutral: 'bg-raised text-ink-dim border-line-strong',
  accent: 'bg-accent-soft text-accent border-accent/40',
};

export function Pill({
  children,
  tone = 'neutral',
  mono = true,
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  mono?: boolean;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-[3px] text-[10.5px] leading-none tracking-[0.08em] uppercase',
        mono && 'font-mono',
        TONE_CLASSES[tone],
        className
      )}
    >
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const CLASSIFICATION_TONE: Record<Classification, Tone> = {
  INTERNAL: 'safe',
  CONFIDENTIAL: 'warn',
  EXECUTIVE: 'danger',
};

export function ClassificationTag({
  value,
  className,
}: {
  value: Classification;
  className?: string;
}) {
  return (
    <Pill tone={CLASSIFICATION_TONE[value]} className={className}>
      {value}
    </Pill>
  );
}

export const STAGE_DOT: Record<StageStatus, string> = {
  idle: 'bg-line-strong',
  active: 'bg-accent',
  ok: 'bg-safe',
  warn: 'bg-warn',
  blocked: 'bg-danger',
};

/* ── Data display ──────────────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  hint?: string;
}) {
  const valueTone = {
    safe: 'text-safe',
    warn: 'text-warn',
    danger: 'text-danger',
    accent: 'text-accent',
    neutral: 'text-ink',
  }[tone];

  return (
    <div className="min-w-0" title={hint}>
      <div className="label-xs mb-1.5 truncate">{label}</div>
      <div
        className={cx(
          'font-mono text-[22px] leading-none font-medium tracking-[-0.02em] tabular-nums',
          valueTone
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** A label/value row used throughout the security result cards. */
export function CheckRow({
  label,
  value,
  tone = 'safe',
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  const valueTone = {
    safe: 'text-safe',
    warn: 'text-warn',
    danger: 'text-danger',
    accent: 'text-accent',
    neutral: 'text-ink-dim',
  }[tone];

  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2 last:border-0">
      <span className="min-w-0 text-[12.5px] text-ink-dim">{label}</span>
      <span
        className={cx(
          'shrink-0 font-mono text-[12.5px] font-medium tabular-nums',
          valueTone
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function Mono({
  children,
  className,
  scroll = true,
}: {
  children: ReactNode;
  className?: string;
  scroll?: boolean;
}) {
  return (
    <pre
      className={cx(
        'rounded-lg border border-line bg-void px-3.5 py-3 font-mono text-[11.5px] leading-[1.65] whitespace-pre-wrap break-words text-ink-dim',
        scroll && 'max-h-72 overflow-auto',
        className
      )}
    >
      {children}
    </pre>
  );
}

export function EmptyState({
  title,
  children,
  icon,
}: {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-ink-faint">{icon}</div>}
      <p className="text-[13px] font-medium text-ink-dim">{title}</p>
      {children && (
        <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-faint">
          {children}
        </p>
      )}
    </div>
  );
}

/** The AUTHORIZATION BOUNDARY divider. The most important line in the product. */
export function BoundaryDivider({ live = false }: { live?: boolean }) {
  return (
    <div className="my-1 flex items-center gap-3 py-1.5" aria-label="Authorization boundary">
      <span
        className={cx(
          'h-px flex-1 bg-gradient-to-r from-transparent',
          live ? 'to-safe/70' : 'to-danger/55'
        )}
      />
      <span
        className={cx(
          'font-mono text-[9.5px] tracking-[0.2em] whitespace-nowrap uppercase transition-colors',
          live ? 'text-safe' : 'text-danger/85'
        )}
      >
        ‖ Authorization boundary ‖
      </span>
      <span
        className={cx(
          'h-px flex-1 bg-gradient-to-l from-transparent',
          live ? 'to-safe/70' : 'to-danger/55'
        )}
      />
    </div>
  );
}
