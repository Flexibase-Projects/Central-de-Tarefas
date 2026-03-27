import type { ReactNode } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from '@mui/material'
import { X } from 'lucide-react'

interface FormDialogProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
}

export function FormDialog({
  open,
  title,
  description,
  onClose,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
}: FormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth={fullWidth} maxWidth={maxWidth}>
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4">{title}</Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {description}
              </Typography>
            ) : null}
          </Box>

          <IconButton size="small" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 2.5, py: 2.25 }}>
        {children}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        {actions ?? <Button onClick={onClose}>Fechar</Button>}
      </DialogActions>
    </Dialog>
  )
}

export default FormDialog
