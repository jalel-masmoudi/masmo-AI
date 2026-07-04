import { FileSearch, Lightbulb } from 'lucide-react'

interface EvidencePanelProps {
  evidence: string[]
  findings: string[]
  isRunning: boolean
}

export function EvidencePanel({
  evidence,
  findings,
  isRunning,
}: EvidencePanelProps) {
  return (
    <section className="panel p-5">
      <header className="mb-5">
        <h2 className="panel-header">Evidence Panel</h2>
        <p className="mt-1 text-sm text-muted">
          Source-backed snippets gathered during the investigation
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <EvidenceColumn
          title="Findings"
          icon={Lightbulb}
          count={findings.length}
          accent="border-success/20 bg-success/5 text-emerald-400"
          emptyMessage={
            isRunning
              ? 'Waiting for the observer to extract findings…'
              : 'No findings yet.'
          }
          items={findings}
        />
        <EvidenceColumn
          title="Evidence"
          icon={FileSearch}
          count={evidence.length}
          accent="border-accent/20 bg-accent-muted text-accent"
          emptyMessage={
            isRunning
              ? 'Retrieving documents, tickets, and incidents…'
              : 'No evidence collected yet.'
          }
          items={evidence}
        />
      </div>
    </section>
  )
}

function EvidenceColumn({
  title,
  icon: Icon,
  count,
  accent,
  emptyMessage,
  items,
}: {
  title: string
  icon: typeof Lightbulb
  count: number
  accent: string
  emptyMessage: string
  items: string[]
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/80">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {title}
        </h3>
        <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-xs tabular-nums text-muted">
          {count}
        </span>
      </div>

      <div className="max-h-[360px] flex-1 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="empty-state">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={`${title}-${index}`}
                className={`rounded-xl border px-4 py-3 text-sm leading-relaxed text-foreground/90 ${accent}`}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
