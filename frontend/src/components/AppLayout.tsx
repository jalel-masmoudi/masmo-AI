import type { ReactNode } from 'react'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-400">
              Masmo
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              Enterprise Investigation Agent
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Autonomous multi-step investigations across projects, tickets, incidents,
              and documents.
            </p>
          </div>
          <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right sm:block">
            <p className="text-xs uppercase tracking-wide text-slate-500">Track</p>
            <p className="text-sm font-medium text-slate-200">Vultr Enterprise Agent</p>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
