import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

interface EnterpriseNodeData {
  label: string
  nodeType: string
  status?: string
}

const typeStyles: Record<
  string,
  { container: string; badge: string; shape: string }
> = {
  employee: {
    container: 'border-slate-500/40 bg-slate-800/90',
    badge: 'text-slate-300',
    shape: 'rounded-full px-4 py-4 min-w-[88px] min-h-[88px] flex items-center justify-center text-center',
  },
  project: {
    container: 'border-sky-500/50 bg-sky-500/15',
    badge: 'text-sky-300',
    shape: 'rounded-2xl',
  },
  ticket: {
    container: 'border-violet-500/40 bg-violet-500/10',
    badge: 'text-violet-300',
    shape: 'rounded-md',
  },
  incident: {
    container: 'border-rose-500/50 bg-rose-500/15',
    badge: 'text-rose-300',
    shape: 'rounded-xl',
  },
  system: {
    container: 'border-cyan-500/40 bg-cyan-500/10',
    badge: 'text-cyan-300',
    shape: 'rounded-2xl',
  },
  document: {
    container: 'border-amber-500/40 bg-amber-500/10',
    badge: 'text-amber-300',
    shape: 'rounded-lg',
  },
  unknown: {
    container: 'border-slate-600/40 bg-slate-800/80',
    badge: 'text-slate-400',
    shape: 'rounded-xl',
  },
}

function EnterpriseNodeComponent({ data }: NodeProps<EnterpriseNodeData>) {
  const styles = typeStyles[data.nodeType] ?? typeStyles.unknown

  return (
    <div
      className={`min-w-[150px] max-w-[180px] border px-3 py-3 shadow-lg ${styles.container} ${styles.shape}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${styles.badge}`}>
        {data.nodeType}
      </p>
      <p className="mt-1 text-xs font-medium leading-snug text-slate-100">{data.label}</p>
      {data.status && (
        <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">{data.status}</p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  )
}

export const EnterpriseNode = memo(EnterpriseNodeComponent)
