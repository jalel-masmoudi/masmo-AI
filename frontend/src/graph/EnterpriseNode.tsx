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
    container: 'border-slate-500/35 bg-bg-elevated/95',
    badge: 'text-slate-400',
    shape: 'rounded-full px-4 py-4 min-w-[88px] min-h-[88px] flex items-center justify-center text-center',
  },
  project: {
    container: 'border-accent/45 bg-accent-muted',
    badge: 'text-accent',
    shape: 'rounded-2xl',
  },
  ticket: {
    container: 'border-violet-500/35 bg-violet-500/10',
    badge: 'text-violet-300',
    shape: 'rounded-lg',
  },
  incident: {
    container: 'border-red-500/45 bg-red-500/10',
    badge: 'text-red-300',
    shape: 'rounded-xl',
  },
  system: {
    container: 'border-cyan-500/35 bg-cyan-500/10',
    badge: 'text-cyan-300',
    shape: 'rounded-2xl',
  },
  document: {
    container: 'border-amber-500/35 bg-amber-500/10',
    badge: 'text-amber-300',
    shape: 'rounded-lg',
  },
  unknown: {
    container: 'border-border bg-bg-elevated/90',
    badge: 'text-muted',
    shape: 'rounded-xl',
  },
}

function EnterpriseNodeComponent({ data }: NodeProps<EnterpriseNodeData>) {
  const styles = typeStyles[data.nodeType] ?? typeStyles.unknown

  return (
    <div
      className={`min-w-[150px] max-w-[180px] border px-3 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm ${styles.container} ${styles.shape}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-muted"
      />
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${styles.badge}`}>
        {data.nodeType}
      </p>
      <p className="mt-1 text-xs font-medium leading-snug text-foreground">
        {data.label}
      </p>
      {data.status && (
        <p className="mt-2 text-[10px] uppercase tracking-wide text-muted">
          {data.status}
        </p>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-muted"
      />
    </div>
  )
}

export const EnterpriseNode = memo(EnterpriseNodeComponent)
