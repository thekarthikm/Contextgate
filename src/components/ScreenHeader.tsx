'use client';

import type { ReactNode } from 'react';

export function ScreenHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 max-w-[68ch]">
        <div className="label-xs mb-2">{eyebrow}</div>
        <h1 className="text-[19px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[21px]">
          {title}
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-dim">{description}</p>
      </div>
      {aside && <div className="shrink-0 lg:max-w-[320px] lg:pt-1">{aside}</div>}
    </header>
  );
}
