import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Avatar, Box, Stack, Typography, Alert } from '@mui/material'
import { AppSidebar } from './AppSidebar'
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown'
import { ViewAsUserButton } from './ViewAsUserButton'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useMyPendingTodosCount } from '@/hooks/use-my-pending-todos'
import { TodoCompleteToast } from '@/components/achievements/TodoCompleteToast'
import { UserLevelProfileDrawer } from './UserLevelProfileDrawer'
import { HeaderProfileButton } from './HeaderProfileButton'
import { HeaderCollapsedSidebarTools } from './HeaderCollapsedSidebarTools'
import type { AuthContextType } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'
import StatusToken from '@/components/system/StatusToken'
const HEADER_HEIGHT = 60
const SIDEBAR_EXPANDED_WIDTH = 248
const SIDEBAR_COLLAPSED_WIDTH = 72

type WorkspaceMember = {
  id: string
  name: string
  avatar_url?: string | null
}

type AuthContextWithWorkspace = AuthContextType & {
  currentWorkspace?: {
    id: string
    slug: string
    name: string
    role_display_name?: string | null
  } | null
}

interface MainLayoutProps {
  children: ReactNode
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
  const { isViewingAs, viewAsUser, stopViewingAs, currentUser, currentWorkspace, getAuthHeaders } =
    useAuth() as unknown as AuthContextWithWorkspace
  const { data: progressData, loading: progressLoading } = useUserProgress()
  const { count: pendingTodosCount } = useMyPendingTodosCount()

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!currentWorkspace?.slug) {
        if (mounted) setWorkspaceMembers([])
        return
      }

      try {
        const response = await fetch(apiUrl(`/api/workspaces/${currentWorkspace.slug}/members`), {
          headers: getAuthHeaders(),
        })
        const body = (await response.json().catch(() => null)) as
          | { members?: WorkspaceMember[] }
          | WorkspaceMember[]
          | null
        const members = Array.isArray(body) ? body : Array.isArray(body?.members) ? body.members : null
        if (!mounted || !response.ok || !members) return
        setWorkspaceMembers(members)
      } catch {
        if (mounted) setWorkspaceMembers([])
      }
    }

    void run()
    return () => {
      mounted = false
    }
  }, [currentWorkspace?.slug, getAuthHeaders])


  const visibleMembers = useMemo(() => workspaceMembers.slice(0, 4), [workspaceMembers])
  const overflowMembers = Math.max(0, workspaceMembers.length - visibleMembers.length)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppSidebar
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        pendingTodosCount={pendingTodosCount}
        progressData={progressData}
        progressLoading={progressLoading}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: `${sidebarWidth}px`,
          transition: (theme) => theme.transitions.create('margin', { duration: 180 }),
          overflow: 'hidden',
        }}
      >
        {isViewingAs && viewAsUser ? (
          <Alert
            severity="warning"
            onClose={stopViewingAs}
            sx={{ borderRadius: 0, py: 0.2, '& .MuiAlert-message': { py: 0.55 } }}
          >
            Visualizando como <strong>{viewAsUser.name}</strong>.
          </Alert>
        ) : null}

        <Box
          sx={{
            minHeight: HEADER_HEIGHT,
            px: { xs: 1.25, md: 2 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
            {sidebarCollapsed ? (
              <HeaderCollapsedSidebarTools
                pendingTodosCount={pendingTodosCount}
                progressData={progressData}
                progressLoading={progressLoading}
              />
            ) : null}

            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                  {currentWorkspace?.name || 'Workspace'}
                </Typography>
                {currentWorkspace?.role_display_name ? (
                  <StatusToken tone="neutral">
                    {currentWorkspace.role_display_name}
                  </StatusToken>
                ) : null}
              </Stack>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            {visibleMembers.length > 0 ? (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
                {visibleMembers.map((member) => (
                  <Avatar
                    key={member.id}
                    src={member.avatar_url ?? undefined}
                    alt={member.name}
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {member.name?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                ))}
                {overflowMembers > 0 ? (
                  <StatusToken tone="neutral">+{overflowMembers}</StatusToken>
                ) : null}
              </Stack>
            ) : null}

            <ViewAsUserButton />
            <NotificationsDropdown />
            {currentUser ? (
              <HeaderProfileButton
                name={currentUser.name}
                avatarUrl={currentUser.avatar_url}
                onClick={() => setProfileDrawerOpen(true)}
              />
            ) : null}
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>{children}</Box>
      </Box>

      <UserLevelProfileDrawer open={profileDrawerOpen} onClose={() => setProfileDrawerOpen(false)} />
    </Box>
  )
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      <MainLayoutContent>{children}</MainLayoutContent>
      <TodoCompleteToast />
    </>
  )
}
