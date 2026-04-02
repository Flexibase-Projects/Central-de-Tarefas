import { Box, Typography } from '@/compat/mui/material'
import { DemandCard } from '@/components/layout/AppSidebar'
import type { UserProgress } from '@/types'
import { buildWorkspacePath } from '@/lib/workspace-routing'
import { useAuth } from '@/contexts/AuthContext'
import AppSurface from '@/components/system/AppSurface'

export interface HeaderCollapsedSidebarToolsProps {
  pendingTodosCount: number | null
  progressData: UserProgress | null
  progressLoading: boolean
}

export function HeaderCollapsedSidebarTools({
  pendingTodosCount,
}: HeaderCollapsedSidebarToolsProps) {
  const { currentWorkspace } = useAuth()

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
        flexShrink: 1,
        overflow: 'hidden',
        maxHeight: 44,
      }}
    >
      <DemandCard
        count={pendingTodosCount}
        headerInline
        targetPath={buildWorkspacePath(currentWorkspace?.slug)}
      />
      <AppSurface compact surface="subtle" sx={{ display: { xs: 'none', md: 'block' } }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          Perfil pelo avatar
        </Typography>
      </AppSurface>
    </Box>
  )
}
