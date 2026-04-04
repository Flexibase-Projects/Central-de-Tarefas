import { Box } from '@/compat/mui/material'
import { DemandCard } from '@/components/layout/AppSidebar'
import type { UserProgress } from '@/types'
import { buildWorkspacePath } from '@/lib/workspace-routing'
import { useAuth } from '@/contexts/AuthContext'

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
        maxHeight: 40,
      }}
    >
      <DemandCard
        count={pendingTodosCount}
        headerInline
        targetPath={buildWorkspacePath(currentWorkspace?.slug)}
      />
    </Box>
  )
}
