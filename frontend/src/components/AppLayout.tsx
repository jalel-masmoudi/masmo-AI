import { Logo } from './Logo'
import { Shield } from 'lucide-react'
import type { ReactNode } from 'react'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="relative min-h-dvh bg-bg-deep text-foreground">
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute right-0 top-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-600/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/5 blur-[80px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-[1440px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 border-b border-border pb-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface shadow-[0_0_24px_var(--color-accent-glow)]">
                <Logo size={28} />
              </div>
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.35em] text-accent">
                  Masmo
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  Enterprise Investigation Agent
                </h1>
                <p className="mt-1.5 max-w-xl text-sm text-muted">
                  Autonomous multi-step investigations across projects, tickets,
                  incidents, and documents.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border-accent/30 bg-accent-muted text-accent">
                <Shield className="h-3 w-3" aria-hidden />
                Vultr Enterprise
              </span>
              <span className="badge text-muted">Gradium Voice</span>
              <span className="badge text-muted">Cloudflare Edge</span>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 pb-8">
          {children}
        </main>

        <footer className="border-t border-border py-4 text-center text-xs text-muted">
          RAISE Summit 2026 · Autonomous agent workflow · Plan → Execute → Observe → Report
        </footer>
      </div>
    </div>
  )
}
