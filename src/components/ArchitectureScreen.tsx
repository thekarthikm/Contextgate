'use client';

import type { QueryResponse } from '@/lib/types';
import { ScreenHeader } from './ScreenHeader';
import { useApp } from './state';
import { BoundaryDivider, Panel, Pill, cx } from './ui';

const PRINCIPLES = [
  {
    number: '01',
    title: 'Authenticate outside the model',
    body: 'Identity comes from a signed session and a server-side record. A prompt is not a credential.',
  },
  {
    number: '02',
    title: 'Authorize before retrieval',
    body: 'The permitted search space is constructed from the identity first. Filtering after retrieval is already too late.',
  },
  {
    number: '03',
    title: 'Assume the model will leak everything it sees',
    body: 'Then the only durable control is what it never sees. Design for absence, not discretion.',
  },
];

const MAPPING = [
  ['Demo identity', 'Enterprise SSO / IdP'],
  ['Local authorization policy', 'RBAC / ABAC / policy engine'],
  ['Static server corpus', 'Enterprise knowledge stores'],
  ['Local relevance ranking', 'Vector DB / search / knowledge graph'],
  ['Demo model', 'Production LLM'],
];

export function ArchitectureScreen() {
  const { latest, identity } = useApp();

  return (
    <div className="flex flex-col gap-4 px-3.5 py-4 sm:px-5 sm:py-5">
      <ScreenHeader
        eyebrow="System design"
        title="One boundary, crossed once, before anything is retrieved"
        description="Every request walks this path. The trust boundary sits above retrieval, so no downstream component — including the model — can widen its own scope."
        aside={
          <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
            <div className="label-xs mb-2">Security invariant</div>
            <p className="font-mono text-[13px] leading-none text-safe">
              Model Context ⊆ Authorized Data
            </p>
            <p className="mt-2.5 text-[11px] leading-relaxed text-ink-faint">
              Holds for every prompt, every request body and every document.
            </p>
          </div>
        }
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <Panel
          eyebrow={latest ? 'Last request' : 'Idle pipeline'}
          title="Request path"
          action={
            latest ? (
              <Pill tone="safe" dot>
                Live
              </Pill>
            ) : (
              <Pill tone="neutral">No data yet</Pill>
            )
          }
        >
          <Flow result={latest} identityName={identity?.name ?? '—'} clearance={identity?.clearance ?? '—'} />
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel eyebrow="Design principles" title="Three rules that make this work">
            <ol className="flex flex-col divide-y divide-line">
              {PRINCIPLES.map((principle) => (
                <li key={principle.number} className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
                  <span className="font-mono text-[11px] text-accent tabular-nums">
                    {principle.number}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[13.5px] font-medium tracking-[-0.01em] text-ink">
                      {principle.title}
                    </h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-dim">
                      {principle.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel eyebrow="Production mapping" title="What each demo component stands in for">
            <ul className="flex flex-col divide-y divide-line">
              {MAPPING.map(([demo, production]) => (
                <li
                  key={demo}
                  className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <span className="min-w-0 font-mono text-[11.5px] text-ink-dim">
                    {demo}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="hidden text-ink-faint sm:inline">→</span>
                    <span className="truncate text-[12.5px] text-ink">{production}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-faint">
              The security property is independent of the retrieval technology.
              Swap local ranking for pgvector, Pinecone, Elasticsearch or a
              knowledge graph and the boundary sits in exactly the same place.
            </p>
          </Panel>

          <Panel eyebrow="Model capability surface" title="What the model cannot do">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                'searchAllDocuments()',
                'getDocument()',
                'executeSQL()',
                'changeUserRole()',
                'setClearance()',
                'retrieveExecutiveFiles()',
              ].map((fn) => (
                <div
                  key={fn}
                  className="flex items-center gap-2.5 rounded-lg border border-line bg-void/50 px-3 py-2"
                >
                  <span className="font-mono text-[11px] text-danger">✕</span>
                  <span className="truncate font-mono text-[11px] text-ink-faint line-through decoration-danger/50">
                    {fn}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3.5 text-[12px] leading-relaxed text-ink-dim">
              The model receives one completed context payload and returns text. It
              has no tools, so it cannot enlarge its own retrieval scope no matter
              what it is told to do.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Flow({
  result,
  identityName,
  clearance,
}: {
  result: QueryResponse | null;
  identityName: string;
  clearance: string;
}) {
  const nodes = [
    {
      key: 'identity',
      label: 'Identity',
      value: result?.identity.name ?? identityName,
      detail: 'Signed session · server record',
    },
    {
      key: 'policy',
      label: 'Authorization policy',
      value: result?.identity.clearance ?? clearance,
      detail: 'Clearance lattice + department scope',
    },
    {
      key: 'corpus',
      label: 'Authorized corpus',
      value: result
        ? `${result.corpus.authorizedDocuments} / ${result.corpus.totalDocuments} documents`
        : '— / —',
      detail: 'The only set retrieval may touch',
      boundaryBefore: true,
    },
    {
      key: 'retrieval',
      label: 'Retrieval',
      value: result ? `${result.contextChunks.length} chunks` : '—',
      detail: 'Ranked inside the permitted set',
    },
    {
      key: 'context',
      label: 'Context builder',
      value: result
        ? `${result.contextChunks.length} / ${result.contextChunks.length} verified`
        : '—',
      detail: 'Aborts the request on any violation',
    },
    {
      key: 'llm',
      label: 'LLM',
      value: result?.modelMode === 'malicious' ? 'Malicious model' : 'No database access',
      detail: 'No tools · cannot retrieve',
    },
    {
      key: 'response',
      label: 'Response',
      value: result ? result.status.replace('_', ' ') : '—',
      detail: result?.modelMode === 'malicious' ? 'Entire context printed' : 'Grounded answer',
    },
  ];

  return (
    <ol className="flex flex-col">
      {nodes.map((node, index) => (
        <li key={node.key} className="min-w-0">
          {node.boundaryBefore && <BoundaryDivider live={Boolean(result)} />}
          <div className="flex min-w-0 gap-3">
            <div className="flex shrink-0 flex-col items-center pt-1.5">
              <span
                className={cx(
                  'size-[7px] rounded-full',
                  result ? 'bg-safe' : 'bg-line-strong'
                )}
              />
              {index < nodes.length - 1 && (
                <span
                  className={cx(
                    'mt-1 w-px flex-1',
                    result ? 'rail-live opacity-60' : 'rail'
                  )}
                />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <div className="label-xs">{node.label}</div>
              <div
                className={cx(
                  'mt-1.5 font-mono text-[13px] leading-none tracking-[-0.01em]',
                  result ? 'text-ink' : 'text-ink-faint'
                )}
              >
                {node.value}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                {node.detail}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
