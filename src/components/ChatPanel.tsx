'use client';

import { useEffect, useRef, useState } from 'react';

import { SUGGESTED_QUESTIONS } from '@/lib/attacks';
import type { Role } from '@/lib/types';
import { SendIcon } from './icons';
import { useApp, type ChatMessage } from './state';
import { Button, ClassificationTag, Panel, Pill, Spinner, cx } from './ui';

const ROLE_LABEL: Record<Role, string> = {
  employee: 'Employee',
  manager: 'Manager',
  executive: 'Executive',
};

export function ChatPanel() {
  const { identity, messages, running, runQuery, latest, setLatest, modelMode } = useApp();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, running]);

  if (!identity) return null;

  async function submit(text: string) {
    const value = text.trim();
    if (!value || running) return;
    setDraft('');
    await runQuery(value);
  }

  return (
    <Panel
      eyebrow="Retrieval-augmented assistant"
      title="Ask Acme Intelligence"
      action={
        <Pill tone={modelMode === 'malicious' ? 'danger' : 'neutral'} dot>
          {modelMode === 'malicious' ? 'Leak everything' : 'Normal model'}
        </Pill>
      }
      bodyClassName="flex min-h-0 flex-col p-0"
    >
      {/* Active identity — the answer's scope is a property of this, nothing else. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-raised/30 px-4 py-2.5 sm:px-5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/20 font-mono text-[10.5px] font-semibold text-accent">
          {identity.name
            .split(' ')
            .map((part) => part[0])
            .join('')}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] leading-none font-medium text-ink">
            {identity.name}
          </span>
          <span className="mt-1 block font-mono text-[10px] tracking-[0.12em] uppercase text-ink-faint">
            {ROLE_LABEL[identity.role]} · {identity.department}
          </span>
        </span>
        <ClassificationTag value={identity.clearance} className="ml-auto" />
      </div>

      {/*
        A fixed transcript height rather than a stretched panel: it keeps the
        two demo columns the same height at every breakpoint and keeps the
        composer on screen without any viewport arithmetic.
      */}
      <div
        ref={scrollRef}
        className="h-[360px] min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:h-[420px] sm:px-5 xl:h-[480px]"
      >
        {messages.length === 0 ? (
          <Welcome />
        ) : (
          <div className="flex flex-col gap-3.5">
            {messages.map((message) => (
              <Bubble
                key={message.id}
                message={message}
                active={Boolean(message.result && latest?.id === message.result.id)}
                onFocus={() => message.result && setLatest(message.result)}
              />
            ))}
            {running && <Thinking />}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line px-4 py-3 sm:px-5">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              disabled={running}
              onClick={() => void submit(question)}
              className="rounded-lg border border-line bg-raised/60 px-2.5 py-1.5 text-[11.5px] text-ink-dim transition-colors hover:border-line-strong hover:bg-raised hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
            >
              {question}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(draft);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submit(draft);
              }
            }}
            rows={1}
            placeholder="Ask anything — including something you are not allowed to know"
            className="min-h-10 max-h-32 flex-1 resize-y rounded-lg border border-line-strong bg-void px-3 py-2.5 text-[13px] leading-snug text-ink placeholder:text-ink-faint focus:border-accent/60"
          />
          <Button type="submit" variant="primary" disabled={!draft.trim() || running}>
            <SendIcon className="size-3.5" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </Panel>
  );
}

function Welcome() {
  return (
    <div className="flex h-full flex-col justify-center gap-4 py-6">
      <div className="max-w-[42ch]">
        <h3 className="text-[15px] font-medium tracking-[-0.01em] text-ink">
          Ask a question the assistant is allowed to answer.
        </h3>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-dim">
          Then ask one it is not. The answer changes because the{' '}
          <span className="text-ink">search space</span> changed before the model
          was invoked — not because the model declined.
        </p>
      </div>
      <div className="rounded-lg border border-line bg-raised/40 px-3.5 py-3">
        <div className="label-xs mb-2">Try this order</div>
        <ol className="space-y-1.5 text-[12px] leading-relaxed text-ink-dim">
          <li>
            <span className="font-mono text-ink-faint">1.</span> What is our
            deployment process?
          </li>
          <li>
            <span className="font-mono text-ink-faint">2.</span> What is Project
            Cedar and what are we paying for it?
          </li>
          <li>
            <span className="font-mono text-ink-faint">3.</span> Switch the model to{' '}
            <span className="text-danger">Leak Everything</span> and ask again.
          </li>
        </ol>
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="animate-fade flex items-center gap-2.5 px-1">
      <Spinner className="text-accent" />
      <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-faint">
        Authorizing · retrieving · building context
      </span>
    </div>
  );
}

function Bubble({
  message,
  active,
  onFocus,
}: {
  message: ChatMessage;
  active: boolean;
  onFocus: () => void;
}) {
  if (message.kind === 'system') {
    return (
      <div className="animate-fade flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-line" />
        <span className="text-center font-mono text-[10px] tracking-[0.1em] uppercase text-ink-faint">
          {message.text}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
    );
  }

  if (message.kind === 'user') {
    return (
      <div className="animate-rise flex justify-end">
        <div className="max-w-[88%] rounded-xl rounded-br-sm border border-accent/35 bg-accent-soft/70 px-3.5 py-2.5">
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words text-ink">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  const result = message.result;
  const malicious = result?.modelMode === 'malicious';

  return (
    <div className="group animate-rise flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onFocus}
        className={cx(
          'max-w-[95%] rounded-xl rounded-bl-sm border px-3.5 py-3 text-left transition-colors',
          malicious
            ? 'border-danger/40 bg-danger-soft/40 hover:border-danger/60'
            : 'border-line bg-raised/60 hover:border-line-strong',
          active && 'ring-1 ring-accent/40'
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <span
            className={cx(
              'font-mono text-[9.5px] tracking-[0.14em] uppercase',
              malicious ? 'text-danger' : 'text-ink-faint'
            )}
          >
            {malicious ? 'Malicious model' : 'Acme Intelligence'}
          </span>
          {result && (
            <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-ink-faint">
              · {result.contextChunks.length} chunk
              {result.contextChunks.length === 1 ? '' : 's'} in context
            </span>
          )}
        </div>
        <p
          className={cx(
            'text-[13px] leading-relaxed break-words',
            malicious
              ? 'font-mono text-[11.5px] leading-[1.6] whitespace-pre-wrap text-ink-dim'
              : 'whitespace-pre-wrap text-ink'
          )}
        >
          {message.text}
        </p>
      </button>
      {result && (
        <span className="px-1 font-mono text-[10px] text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
          Click to inspect this request
        </span>
      )}
    </div>
  );
}
