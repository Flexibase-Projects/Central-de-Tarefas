import type { ReactNode } from 'react'
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Typography,
} from '@/compat/mui/material'
import { X } from 'lucide-react'

interface SidePanelProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number | string | { xs?: number | string; sm?: number | string; md?: number | string; lg?: number | string }
}

export function SidePanel({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  width = { xs: '100%', sm: 520 },
}: SidePanelProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width,
          borderLeft: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4">{title}</Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {description}
              </Typography>
            ) : null}
          </Box>

          <IconButton size="small" onClick={onClose} aria-label="Fechar painel">
            <X size={16} />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2.25 }}>
          {children}
        </Box>

        <Divider />

        <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.25 }}>
          {footer ?? <Button onClick={onClose}>Fechar</Button>}
        </Box>
      </Box>
    </Drawer>
  )
}

export default SidePanel
