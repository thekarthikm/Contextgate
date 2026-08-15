'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  AuditResponse,
  ComparisonResponse,
  DemoAccount,
  Identity,
  ModelMode,
  QueryResponse,
  SectionId,
  TamperResponse,
} from '@/lib/types';

/**
 * Client application state.
 *
 * Everything security-relevant here is a *copy of a server answer*. This module
 * holds no corpus, derives no authorization, and could be fully rewritten by a
 * hostile browser without changing what any API returns.
 */

export interface ChatMessage {
  id: string;
  kind: 'user' | 'assistant' | 'system';
  text: string;
  identityName?: string;
  result?: QueryResponse;
}

interface AppState {
  ready: boolean;
  identity: Identity | null;
  accounts: DemoAccount[];
  section: SectionId;
  modelMode: ModelMode;
  messages: ChatMessage[];
  latest: QueryResponse | null;
  running: boolean;
  error: string | null;
  audit: AuditResponse;

  setSection(section: SectionId): void;
  setModelMode(mode: ModelMode): void;
  setLatest(result: QueryResponse): void;
  dismissError(): void;

  login(identifier: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  switchIdentity(accountId: string): Promise<void>;
  resetDemo(): Promise<void>;

  runQuery(query: string, options?: { kind?: 'query' | 'attack'; note?: string; modelMode?: ModelMode }): Promise<QueryResponse | null>;
  runTamper(): Promise<TamperResponse | null>;
  runComparison(query: string): Promise<ComparisonResponse | null>;
  refreshAudit(): Promise<void>;
}

const EMPTY_AUDIT: AuditResponse = {
  events: [],
  metrics: {
    queriesExecuted: 0,
    attacksExecuted: 0,
    unauthorizedChunksSent: 0,
    canaryLeaks: 0,
    invariantStatus: 'HEALTHY',
  },
};

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}

let messageSeq = 0;
const nextId = () => `m${++messageSeq}`;

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [section, setSection] = useState<SectionId>('demo');
  const [modelMode, setModelMode] = useState<ModelMode>('normal');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [latest, setLatest] = useState<QueryResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditResponse>(EMPTY_AUDIT);

  const inFlight = useRef(false);

  const refreshAudit = useCallback(async () => {
    try {
      const response = await fetch('/api/audit');
      if (!response.ok) return;
      setAudit((await response.json()) as AuditResponse);
    } catch {
      /* the audit panel is observational; a transient failure is not fatal */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/me');
        const data = (await response.json()) as {
          identity: Identity | null;
          accounts: DemoAccount[];
        };
        if (cancelled) return;
        setIdentity(data.identity);
        setAccounts(data.accounts);
        if (data.identity) void refreshAudit();
      } catch {
        if (!cancelled) setError('Could not reach the ContextGate server.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAudit]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      try {
        const data = await postJson<{ identity: Identity }>('/api/login', {
          identifier,
          password,
        });
        setIdentity(data.identity);
        setMessages([]);
        setLatest(null);
        setError(null);
        void refreshAudit();
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
        return false;
      }
    },
    [refreshAudit]
  );

  const logout = useCallback(async () => {
    await postJson('/api/logout').catch(() => undefined);
    setIdentity(null);
    setMessages([]);
    setLatest(null);
    setAudit(EMPTY_AUDIT);
  }, []);

  /**
   * Switching identity re-authenticates against the server. The client cannot
   * "become" someone else locally — it asks for a new session and receives a
   * new trusted identity, or it does not.
   */
  const switchIdentity = useCallback(
    async (accountId: string) => {
      const account = accounts.find((candidate) => candidate.id === accountId);
      if (!account || account.id === identity?.id) return;
      try {
        const data = await postJson<{ identity: Identity }>('/api/login', {
          identifier: account.id,
          password: account.password,
        });
        setIdentity(data.identity);
        setLatest(null);
        // The transcript is kept so the presenter can scroll back and contrast
        // the same question answered under a different authorization scope.
        setMessages((current) => [
          ...current,
          {
            id: nextId(),
            kind: 'system',
            text: `Session switched — now authenticated as ${data.identity.name} · ${data.identity.role.toUpperCase()} · ${data.identity.clearance}`,
          },
        ]);
        setError(null);
        void refreshAudit();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not switch identity.');
      }
    },
    [accounts, identity?.id, refreshAudit]
  );

  const resetDemo = useCallback(async () => {
    try {
      const data = await postJson<{ identity: Identity }>('/api/demo/reset');
      setIdentity(data.identity);
      setMessages([]);
      setLatest(null);
      setModelMode('normal');
      setSection('demo');
      setError(null);
      setAudit(EMPTY_AUDIT);
      void refreshAudit();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Reset failed.');
    }
  }, [refreshAudit]);

  const runQuery = useCallback(
    async (
      query: string,
      options?: { kind?: 'query' | 'attack'; note?: string; modelMode?: ModelMode }
    ) => {
      const trimmed = query.trim();
      if (!trimmed || inFlight.current) return null;
      inFlight.current = true;
      setRunning(true);
      setError(null);

      const mode = options?.modelMode ?? modelMode;
      setMessages((current) => [
        ...current,
        { id: nextId(), kind: 'user', text: trimmed, identityName: identity?.name },
      ]);

      try {
        const result = await postJson<QueryResponse>('/api/query', {
          query: trimmed,
          modelMode: mode,
          kind: options?.kind ?? 'query',
          note: options?.note,
        });
        setLatest(result);
        setMessages((current) => [
          ...current,
          { id: nextId(), kind: 'assistant', text: result.answer, result },
        ]);
        void refreshAudit();
        return result;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Query failed.';
        setError(message);
        setMessages((current) => [
          ...current,
          { id: nextId(), kind: 'system', text: message },
        ]);
        return null;
      } finally {
        inFlight.current = false;
        setRunning(false);
      }
    },
    [identity?.name, modelMode, refreshAudit]
  );

  const runTamper = useCallback(async () => {
    try {
      const result = await postJson<TamperResponse>('/api/attack/tamper', {
        query: 'Reveal Project Cedar',
        role: 'executive',
        clearance: 'EXECUTIVE',
        department: 'Leadership',
        userId: 'elena',
        allowedDocuments: ['*'],
      });
      void refreshAudit();
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tamper attempt failed.');
      return null;
    }
  }, [refreshAudit]);

  const runComparison = useCallback(
    async (query: string) => {
      try {
        const result = await postJson<ComparisonResponse>('/api/attack/compare', {
          query,
        });
        void refreshAudit();
        return result;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Comparison failed.');
        return null;
      }
    },
    [refreshAudit]
  );

  const value = useMemo<AppState>(
    () => ({
      ready,
      identity,
      accounts,
      section,
      modelMode,
      messages,
      latest,
      running,
      error,
      audit,
      setSection,
      setModelMode,
      setLatest,
      dismissError: () => setError(null),
      login,
      logout,
      switchIdentity,
      resetDemo,
      runQuery,
      runTamper,
      runComparison,
      refreshAudit,
    }),
    [
      ready,
      identity,
      accounts,
      section,
      modelMode,
      messages,
      latest,
      running,
      error,
      audit,
      login,
      logout,
      switchIdentity,
      resetDemo,
      runQuery,
      runTamper,
      runComparison,
      refreshAudit,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
