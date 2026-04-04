import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Avatar, Box, Typography, useTheme } from '@/compat/mui/material'
import { HANDLE_CLASS, flowHandleStyle } from '@/components/cost-management/CostFlowNodes'

export type OrgPersonNodeData = {
  personName: string
  jobTitle: string | null
  orgEntryId: string
  highlighted?: boolean
}

function OrgPersonNode({ data, selected }: NodeProps) {
  const theme = useTheme()
  const d = data as OrgPersonNodeData
  const hl = d.highlighted ?? false
  const titleLine = d.jobTitle?.trim() ? d.jobTitle.trim() : '—'
  const accent = hl ? '#a855f7' : theme.palette.text.secondary
  return (
    <Box
      className="cdt-rf-node"
      sx={{
        position: 'relative',
        minWidth: 200,
        maxWidth: 240,
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        border: '2px solid',
        borderColor: selected ? 'primary.main' : hl ? 'secondary.main' : 'divider',
        bgcolor: hl ? 'action.selected' : 'background.paper',
        boxShadow: selected ? 4 : hl ? 2 : 1,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        [`&:hover .${HANDLE_CLASS}`]: { opacity: 1 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Avatar sx={{ width: 40, height: 40, mt: 0.125 }}>{d.personName?.charAt(0)?.toUpperCase() ?? '?'}</Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            noWrap
            sx={{
              lineHeight: 1.25,
              color: 'text.primary',
              letterSpacing: 0.15,
            }}
          >
            {titleLine}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.35, fontWeight: 400 }}>
            {d.personName}
          </Typography>
        </Box>
      </Box>
      <Handle
        className={HANDLE_CLASS}
        type="target"
        position={Position.Top}
        id="t-top"
        isConnectable={false}
        style={{
          ...flowHandleStyle(accent, { connectable: false }),
          opacity: 0.35,
        }}
      />
      <Handle
        className={HANDLE_CLASS}
        type="source"
        position={Position.Bottom}
        id="s-bottom"
        isConnectable={false}
        style={{
          ...flowHandleStyle(accent, { connectable: false }),
          opacity: 0.35,
        }}
      />
    </Box>
  )
}

export default memo(OrgPersonNode)
