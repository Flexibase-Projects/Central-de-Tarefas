import type { ReactNode } from 'react'
import { Box, Divider } from '@mui/material'
import AppSurface from './AppSurface'
import SectionHeader from './SectionHeader'

interface DataTableShellProps {
  title?: string
  description?: string
  actions?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
}

export function DataTableShell({ title, description, actions, toolbar, children }: DataTableShellProps) {
  return (
    <AppSurface sx={{ p: 0, overflow: 'hidden' }}>
      {title ? (
        <>
          <Box sx={{ px: 2, pt: 2 }}>
            <SectionHeader title={title} description={description} actions={actions} sx={{ pb: toolbar ? 1.25 : 1.5 }} />
          </Box>
          <Divider />
        </>
      ) : null}

      {toolbar ? (
        <>
          <Box sx={{ px: 2, py: 1.5 }}>
            {toolbar}
          </Box>
          <Divider />
        </>
      ) : null}

      <Box sx={{ width: '100%', overflow: 'auto' }}>
        {children}
      </Box>
    </AppSurface>
  )
}

export default DataTableShell
