'use client';

import { ChatPanel } from './ChatPanel';
import { ContextInspector } from './ContextInspector';
import { ModelModeToggle } from './ModelModeToggle';
import { SecurityTrace } from './SecurityTrace';
import { ScreenHeader } from './ScreenHeader';
import { useApp } from './state';
import { Pill } from './ui';

export function DemoScreen() {
  const { latest } = useApp();

  return (
    <div className="flex flex-col gap-4 px-3.5 py-4 sm:px-5 sm:py-5">
      <ScreenHeader
        eyebrow="Live demonstration"
        title="Authorization happens before retrieval"
        description="The same application, the same corpus and the same model produce different answers for different identities — because the search space is decided before the model is invoked."
        aside={<ModelModeToggle />}
      />

      {latest && (
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={latest.status === 'BLOCKED' ? 'danger' : 'safe'} dot>
            {latest.status.replace('_', ' ')}
          </Pill>
          <span className="font-mono text-[11px] text-ink-faint">
            {latest.corpus.authorizedDocuments} / {latest.corpus.totalDocuments}{' '}
            documents authorized ·{' '}
            {latest.corpus.authorizedChunks} / {latest.corpus.totalChunks} chunks
            searchable · {latest.contextChunks.length} sent to model
          </span>
        </div>
      )}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_384px]">
        <ChatPanel />
        <SecurityTrace />
      </div>

      <ContextInspector />
    </div>
  );
}
