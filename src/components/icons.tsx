'use client';

/**
 * Hand-rolled 16px stroke icons. An icon dependency would be pure weight for
 * the eight glyphs this product needs.
 */

type IconProps = { className?: string };

const base = 'shrink-0';

function Svg({
  className,
  children,
  size = 16,
}: IconProps & { children: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`${base} ${className ?? ''}`}
    >
      {children}
    </svg>
  );
}

export function GateMark({ className }: IconProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden
      className={`${base} ${className ?? ''}`}
    >
      <path
        d="M11 1.6 3.4 4.4v5.9c0 4.4 3.1 8.2 7.6 9.7 4.5-1.5 7.6-5.3 7.6-9.7V4.4L11 1.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.9 10.9h8.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="11" cy="10.9" r="1.9" fill="currentColor" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2.2 8.2c0-2.9 2.6-5.2 5.8-5.2s5.8 2.3 5.8 5.2-2.6 5.2-5.8 5.2c-.8 0-1.5-.1-2.2-.4L2.6 14l.7-2.4a4.9 4.9 0 0 1-1.1-3.4Z" />
    </Svg>
  );
}

export function TargetIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="8" cy="8" r="5.8" />
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 .8v2.2M8 13v2.2M.8 8H3M13 8h2.2" />
    </Svg>
  );
}

export function LayersIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 1.9 1.7 5 8 8.1 14.3 5 8 1.9Z" />
      <path d="M1.7 8.5 8 11.6l6.3-3.1" />
      <path d="M1.7 11.9 8 15l6.3-3.1" />
    </Svg>
  );
}

export function PulseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M1 8h3l1.7-4.3L8.4 12l1.9-4h3.7" />
    </Svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 6.2 8 10l4-3.8" />
    </Svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 8.4 6.2 11.6 13 4.8" />
    </Svg>
  );
}

export function CrossIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 2.2 1.6 13.4h12.8L8 2.2Z" />
      <path d="M8 6.4v3.1" />
      <circle cx="8" cy="11.4" r=".7" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M13.6 6.9A5.7 5.7 0 0 0 3.2 5.1" />
      <path d="M2.4 9.1a5.7 5.7 0 0 0 10.4 1.8" />
      <path d="M3.1 2.2v2.9h2.9M12.9 13.8v-2.9H10" />
    </Svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.2" y="7" width="9.6" height="7" rx="1.6" />
      <path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" />
    </Svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2 8 14 2.6 10.6 14 8.2 9.8 2 8Z" />
    </Svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4.6 3.2 12.4 8l-7.8 4.8V3.2Z" />
    </Svg>
  );
}

export function DocIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 1.8h5l3.2 3.2v9.2H4V1.8Z" />
      <path d="M9 1.8V5h3.2" />
    </Svg>
  );
}
