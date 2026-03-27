import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Box, Menu as MuiMenu, MenuItem, Tooltip } from '@mui/material'
import { DemandCard } from '@/components/layout/AppSidebar'
import { LEVEL_CARD_MENU_ITEMS } from '@/components/layout/sidebar-level-nav'
import type { UserProgress } from '@/types'
import { buildWorkspacePath, stripWorkspacePrefix } from '@/lib/workspace-routing'
import { useAuth } from '@/contexts/AuthContext'
import AppSurface from '@/components/system/AppSurface'
import ProgressIndicator from '@/components/system/ProgressIndicator'
import StatusToken from '@/components/system/StatusToken'

export interface HeaderCollapsedSidebarToolsProps {
  pendingTodosCount: number | null
  progressData: UserProgress | null
  progressLoading: boolean
}

export function HeaderCollapsedSidebarTools({
  pendingTodosCount,
  progressData,
  progressLoading,
}: HeaderCollapsedSidebarToolsProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentWorkspace } = useAuth()
  const [levelMenuAnchor, setLevelMenuAnchor] = useState<HTMLElement | null>(null)
  const normalizedPath = stripWorkspacePrefix(location.pathname)

  return (
    <>
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
          targetPath={buildWorkspacePath(currentWorkspace?.slug, '/indicadores')}
        />
        <Tooltip title="Nivel, conquistas e ajuda" placement="bottom">
          <AppSurface
            surface="subtle"
            onClick={(event) => setLevelMenuAnchor(event.currentTarget)}
            sx={{
              minWidth: 150,
              px: 1,
              py: 0.75,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            role="button"
            tabIndex={0}
          >
            <StatusToken tone="info">
              Lv. {progressData?.level ?? 1}
            </StatusToken>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <ProgressIndicator
                value={
                  progressData
                    ? Math.min(100, ((progressData.xpInCurrentLevel ?? 0) / Math.max(1, progressData.xpForNextLevel ?? 1)) * 100)
                    : progressLoading ? 35 : 0
                }
                tone="gamification"
              />
            </Box>
          </AppSurface>
        </Tooltip>
      </Box>

      <MuiMenu
        anchorEl={levelMenuAnchor}
        open={Boolean(levelMenuAnchor)}
        onClose={() => setLevelMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 200,
              mt: 0.5,
            },
          },
        }}
      >
        {LEVEL_CARD_MENU_ITEMS.map((item) => {
          const Icon = item.icon
          const active = normalizedPath === item.url
          return (
            <MenuItem
              key={item.url}
              onClick={() => {
                setLevelMenuAnchor(null)
                navigate(buildWorkspacePath(currentWorkspace?.slug, item.url))
              }}
              sx={{
                gap: 1.5,
                py: 1.1,
                fontSize: 13,
                fontWeight: 600,
                color: active ? 'primary.main' : 'text.primary',
              }}
            >
              <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                <Icon size={18} style={{ flexShrink: 0, ...item.iconStyle }} />
              </span>
              {item.title}
            </MenuItem>
          )
        })}
      </MuiMenu>
    </>
  )
}
