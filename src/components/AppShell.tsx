'use client';

import { ArchitectureScreen } from './ArchitectureScreen';
import { AttackLab } from './AttackLab';
import { AuditScreen } from './AuditScreen';
import { DemoScreen } from './DemoScreen';
import { LoginScreen } from './LoginScreen';
import { MobileNav, SideNav } from './Nav';
import { TopBar } from './TopBar';
import { AppProvider, useApp } from './state';
import { GateMark } from './icons';

export function AppShell() {
  return (
    <AppProvider>
      <Workspace />
    </AppProvider>
  );
}

function Workspace() {
  const { ready, identity, section } = useApp();

  if (!ready) return <Booting />;
  if (!identity) return <LoginScreen />;

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SideNav />
        {/*
          Sections are swapped client-side rather than routed, so moving between
          them is instantaneous and never discards the query in progress.
        */}
        <main className="min-w-0 flex-1">
          {section === 'demo' && <DemoScreen />}
          {section === 'attack' && <AttackLab />}
          {section === 'architecture' && <ArchitectureScreen />}
          {section === 'audit' && <AuditScreen />}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

function Booting() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <span className="animate-breathe flex size-11 items-center justify-center rounded-xl border border-line-strong bg-raised text-accent">
        <GateMark />
      </span>
      <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint">
        Establishing trusted session
      </p>
    </div>
  );
}
