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
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <header className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Evidence Panel
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Source-backed snippets gathered during the investigation
        </p>
      </header>

      <div className="max-h-[420px] space-y-5 overflow-y-auto pr-1">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Findings
            </h3>
            <span className="text-xs text-slate-600">{findings.length}</span>
          </div>
          {findings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
              {isRunning
                ? 'Waiting for the observer to extract findings...'
                : 'No findings yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {findings.map((finding, index) => (
                <li
                  key={`finding-${index}`}
                  className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm text-slate-200"
                >
                  {finding}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300">
              Evidence
            </h3>
            <span className="text-xs text-slate-600">{evidence.length}</span>
          </div>
          {evidence.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
              {isRunning
                ? 'Retrieving documents, tickets, and incidents...'
                : 'No evidence collected yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {evidence.map((item, index) => (
                <li
                  key={`evidence-${index}`}
                  className="rounded-xl border border-violet-500/15 bg-violet-500/5 px-4 py-3 text-sm leading-relaxed text-slate-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
