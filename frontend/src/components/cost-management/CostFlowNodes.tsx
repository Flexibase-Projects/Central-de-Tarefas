import { memo, type CSSProperties } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Avatar, Box, Chip, Typography, useTheme } from '@/compat/mui/material'
export const HANDLE_CLASS = 'cdt-rf-handle'

/**
 * Pontos de conexão discretos (inspirado em grafo tipo Obsidian): bolinha pequena,
 * opaca no hover do card (sem animação de escala). Área útil ~14px.
 * Handles por último no DOM + z-index alto = clique não some atrás do MUI.
 */
export function flowHandleStyle(accent: string, opts?: { connectable?: boolean }): CSSProperties {
  const connectable = opts?.connectable !== false
  return {
    width: 14,
    height: 14,
    zIndex: 50,
    pointerEvents: connectable ? 'auto' : 'none',
    borderRadius: '50%',
    border: `2px solid ${accent}`,
    background: 'rgba(255,255,255,0.95)',
    boxSizing: 'border-box',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
    opacity: connectable ? 0.38 : 0.2,
  }
}

/** Tipos de `data` dos nós (exportados para o fluxo / handlers) */
export type DeptFlowData = {
  name: string
  departmentId: string
  highlighted?: boolean
  /** Pessoas do organograma com `department_id` = este departamento */
  responsibles?: { orgEntryId: string; personName: string; jobTitle: string | null }[]
}

function formatResponsiblesLine(list: NonNullable<DeptFlowData['responsibles']>): string {
  if (list.length === 0) return ''
  const parts = list.slice(0, 2).map((r) => (r.jobTitle?.trim() ? `${r.personName} — ${r.jobTitle}` : r.personName))
  const more = list.length > 2 ? ` +${list.length - 2}` : ''
  return `${parts.join(' · ')}${more}`
}

export const DepartmentCostNode = memo(function DepartmentCostNode({ data }: NodeProps) {
  const theme = useTheme()
  const d = data as DeptFlowData
  const accent = d.highlighted ? '#a855f7' : theme.palette.text.secondary
  const resp = d.responsibles ?? []
  const respText = formatResponsiblesLine(resp)
  return (
    <Box
      className="cdt-rf-node"
      sx={{
        position: 'relative',
        minWidth: 200,
        maxWidth: 280,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        border: '2px solid',
        borderColor: 'divider',
        bgcolor: d.highlighted ? 'action.selected' : 'background.paper',
        boxShadow: d.highlighted ? 3 : 1,
        [`&:hover .${HANDLE_CLASS}`]: { opacity: 1 },
      }}
    >
      <Typography variant="subtitle1" fontWeight={700}>
        {d.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Departamento
      </Typography>
      {resp.length > 0 ? (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 0.5, lineHeight: 1.35 }}
          title={resp.map((r) => (r.jobTitle?.trim() ? `${r.personName} — ${r.jobTitle}` : r.personName)).join('\n')}
        >
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Responsável:{' '}
          </Box>
          {respText}
        </Typography>
      ) : (
        <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
          Sem responsável no organograma (Gerenciar → vincular pessoa)
        </Typography>
      )}
      <Handle
        className={HANDLE_CLASS}
        type="target"
        position={Position.Top}
        id="t-top"
        isConnectable
        style={flowHandleStyle(accent)}
      />
      <Handle
        className={HANDLE_CLASS}
        type="source"
        position={Position.Bottom}
        id="s-bottom"
        isConnectable
        style={flowHandleStyle(accent)}
      />
    </Box>
  )
})

export type CostFlowData = {
  costId: string
  name: string
  amount: number
  currency: string
  status: string
  highlighted?: boolean
}

export const CostItemFlowNode = memo(function CostItemFlowNode({ data }: NodeProps) {
  const theme = useTheme()
  const d = data as CostFlowData
  const fmt = d.amount.toLocaleString('pt-BR', { style: 'currency', currency: d.currency || 'BRL' })
  const accent = d.highlighted ? '#a855f7' : theme.palette.text.secondary
  return (
    <Box
      className="cdt-rf-node"
      sx={{
        position: 'relative',
        minWidth: 180,
        maxWidth: 220,
        [`&:hover .${HANDLE_CLASS}`]: { opacity: 1 },
      }}
    >
      <Box
        title="Clique para editar · arraste do ponto inferior ao departamento (ou superior) para vincular"
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: d.highlighted ? 'action.selected' : 'background.paper',
          cursor: 'pointer',
          transition: 'transform 0.15s, box-shadow 0.15s',
          '&:hover': {
            boxShadow: 2,
            borderColor: 'var(--border-strong)',
          },
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} noWrap>
          {d.name}
        </Typography>
        <Typography variant="body2" color="text.primary">
          {fmt}
        </Typography>
        <Chip label={d.status} size="small" sx={{ mt: 0.5, height: 22, fontSize: '0.65rem' }} />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
          Arraste o ponto ·↔· para ligar ao departamento
        </Typography>
      </Box>
      <Handle className={HANDLE_CLASS} type="target" position={Position.Top} id="t-top" isConnectable style={flowHandleStyle(accent)} />
      <Handle className={HANDLE_CLASS} type="source" position={Position.Bottom} id="s-bottom" isConnectable style={flowHandleStyle(accent)} />
    </Box>
  )
})

export type MemberFlowData = {
  name: string
  monthlyCost: number
  avatarUrl: string | null
  highlighted?: boolean
  departmentId: string
  userId: string
}

export const MemberFlowNode = memo(function MemberFlowNode({ data }: NodeProps) {
  const theme = useTheme()
  const d = data as MemberFlowData
  const fmt = d.monthlyCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const accent = d.highlighted ? '#22c55e' : theme.palette.text.secondary
  return (
    <Box
      className="cdt-rf-node"
      sx={{
        position: 'relative',
        minWidth: 180,
        px: 1.5,
        py: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: d.highlighted ? 'action.selected' : 'background.paper',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'pointer',
        [`&:hover .${HANDLE_CLASS}`]: {
          opacity: 0.55,
        },
      }}
    >
      <Avatar src={d.avatarUrl ?? undefined} sx={{ width: 36, height: 36 }}>
        {d.name?.charAt(0)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {d.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {fmt}/mês
        </Typography>
      </Box>
      <Handle
        className={HANDLE_CLASS}
        type="target"
        position={Position.Top}
        id="t-top"
        isConnectable={false}
        style={{
          ...flowHandleStyle(accent, { connectable: false }),
          opacity: 0.22,
        }}
      />
    </Box>
  )
})
