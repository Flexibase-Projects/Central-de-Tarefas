import { ReactNode, useMemo, useState } from 'react'
import { Avatar, Box, Stack, Typography, Alert, Tooltip, Button } from '@/compat/mui/material'
import type { Theme } from '@/compat/mui/styles'
import { AppSidebar } from './AppSidebar'
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown'
import { ViewAsUserButton } from './ViewAsUserButton'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useMyPendingTodosCount } from '@/hooks/use-my-pending-todos'
import { useWorkspaceProfile } from '@/hooks/use-workspace-profile'
import { TodoCompleteToast } from '@/components/achievements/TodoCompleteToast'
import { UserLevelProfileDrawer } from './UserLevelProfileDrawer'
import { HeaderProfileButton } from './HeaderProfileButton'
import { HeaderCollapsedSidebarTools } from './HeaderCollapsedSidebarTools'
import { WorkspaceNavigationWarmup } from '@/components/system/WorkspaceNavigationWarmup'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import {
  APP_SHELL_HEADER_HEIGHT,
  APP_SHELL_SIDEBAR_COLLAPSED_WIDTH,
  APP_SHELL_SIDEBAR_EXPANDED_WIDTH,
} from './layout-shell'
import type { AuthContextType } from '@/contexts/AuthContext'
import StatusToken from '@/components/system/StatusToken'
import { DeliveryHeatMapProvider } from '@/contexts/DeliveryHeatContext'
import { DeliveryHeatAvatarWrap } from '@/components/gamification/DeliveryHeatAvatarWrap'
import { SuperhotEmberParticles } from '@/components/gamification/SuperhotEmberParticles'
import { resolveDeliveryHeat } from '@/utils/delivery-heat'

type WorkspaceMember = {
  id: string
  name: string
  email?: string | null
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
  const [profileDrawerUser, setProfileDrawerUser] = useState<WorkspaceMember | null>(null)
  const sidebarWidth = sidebarCollapsed ? APP_SHELL_SIDEBAR_COLLAPSED_WIDTH : APP_SHELL_SIDEBAR_EXPANDED_WIDTH
  const {
    isViewingAs,
    viewAsUser,
    stopViewingAs,
    currentUser,
    currentWorkspace,
    userProfileTransientError,
    refreshUserData,
  } = useAuth() as unknown as AuthContextWithWorkspace
  const { data: progressData, loading: progressLoading } = useUserProgress()
  const { count: pendingTodosCount } = useMyPendingTodosCount()
  const { profile: workspaceProfile } = useWorkspaceProfile(currentWorkspace?.slug ?? null)
  const { members: workspaceMembers } = useWorkspaceMembers(currentWorkspace?.slug ?? null)
  const { gamificationEnabled } = useWorkspaceContext(currentWorkspace?.slug ?? null)


  const visibleMembers = useMemo(() => workspaceMembers.slice(0, 5), [workspaceMembers])
  const overflowMembers = Math.max(0, workspaceMembers.length - visibleMembers.length)

  return (
    <DeliveryHeatMapProvider gamificationEnabled={gamificationEnabled} members={workspaceMembers}>
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <WorkspaceNavigationWarmup />

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
          transition: (theme: Theme) => theme.transitions.create('margin', { duration: 180 }),
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

        {currentUser && userProfileTransientError ? (
          <Alert
            severity="warning"
            sx={{
              borderRadius: 0,
              py: 0.35,
              flexWrap: 'wrap',
              '& .MuiAlert-message': { py: 0.35, width: '100%' },
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              sx={{ width: '100%', gap: 1 }}
            >
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                {userProfileTransientError}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => void refreshUserData()}>
                Tentar novamente
              </Button>
            </Stack>
          </Alert>
        ) : null}

        <Box
          sx={{
            minHeight: APP_SHELL_HEADER_HEIGHT,
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
            <HeaderCollapsedSidebarTools
              show={sidebarCollapsed}
              pendingTodosCount={pendingTodosCount}
              progressData={progressData}
              progressLoading={progressLoading}
            />

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
              <Stack
                direction="row"
                alignItems="center"
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  '& > *:not(:first-of-type)': {
                    /* -1 theme ≈ -8px; +3px entre avatares ≈ -5px */
                    ml: '-5px',
                  },
                }}
              >
                {visibleMembers.map((member) => {
                  const peek = member.gamification_peek
                  const deliveryHeat =
                    gamificationEnabled && peek ? resolveDeliveryHeat(peek.todos_delivered_30d) : null
                  return (
                  <Tooltip
                    key={member.id}
                    arrow
                    className={
                      gamificationEnabled &&
                      peek &&
                      deliveryHeat?.tier === 'superhot'
                        ? 'cdt-delivery-heat-tooltip--superhot'
                        : undefined
                    }
                    title={
                      gamificationEnabled && peek ? (
                        <Box sx={{ position: 'relative', overflow: 'visible' }}>
                          {deliveryHeat?.tier === 'superhot' ? (
                            <SuperhotEmberParticles seed={member.id} variant="tooltip-bar" />
                          ) : null}
                          <Stack
                            spacing={0.35}
                            sx={{ maxWidth: 240, py: 0.15, position: 'relative', zIndex: 3 }}
                          >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, lineHeight: 1.25, display: 'block' }}
                          >
                            {member.name}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                              lineHeight: 1.25,
                            }}
                          >
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: peek.tier_color,
                              }}
                            >
                              Lv.{peek.level}
                            </Typography>
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: 700,
                                ...(deliveryHeat && deliveryHeat.tier !== 'none'
                                  ? { color: deliveryHeat.meta.accentColor }
                                  : {}),
                              }}
                              color={deliveryHeat?.tier === 'none' ? 'text.secondary' : undefined}
                            >
                              {`{${peek.todos_delivered_30d}}`}
                            </Typography>
                          </Box>
                          {deliveryHeat && deliveryHeat.tier !== 'none' ? (
                            <Typography
                              variant="caption"
                              sx={{
                                lineHeight: 1.2,
                                fontWeight: 700,
                                color: deliveryHeat.meta.accentColor,
                              }}
                            >
                              {deliveryHeat.meta.label}
                            </Typography>
                          ) : null}
                        </Stack>
                        </Box>
                      ) : (
                        member.name
                      )
                    }
                  >
                    <Box
                      component="button"
                      type="button"
                      onClick={() => {
                        setProfileDrawerUser(member)
                        setProfileDrawerOpen(true)
                      }}
                      aria-label={`Abrir perfil de ${member.name}`}
                      sx={{
                        p: 0,
                        m: 0,
                        border: 'none',
                        background: 'transparent',
                        display: 'inline-flex',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'transform 140ms ease',
                        '&:hover, &:focus-visible': {
                          zIndex: 2,
                          transform: 'translateY(-1px) scale(1.06)',
                          outline: 'none',
                        },
                        '&:hover .workspace-member-avatar, &:focus-visible .workspace-member-avatar': {
                          boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.35), 0 10px 24px rgba(15, 23, 42, 0.14)',
                          filter: 'saturate(1.06)',
                        },
                      }}
                    >
                      <DeliveryHeatAvatarWrap userId={member.id} enabled={gamificationEnabled} size="md">
                        <Avatar
                          className="workspace-member-avatar"
                          src={member.avatar_url ?? undefined}
                          alt={member.name}
                          sx={{
                            width: 34,
                            height: 34,
                            fontSize: 13,
                            fontWeight: 700,
                            border: '2px solid',
                            borderColor: 'background.paper',
                            boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.08)',
                            transition: 'box-shadow 140ms ease, filter 140ms ease',
                          }}
                        >
                          {member.name?.[0]?.toUpperCase() ?? '?'}
                        </Avatar>
                      </DeliveryHeatAvatarWrap>
                    </Box>
                  </Tooltip>
                )
              })}
                {overflowMembers > 0 ? (
                  <StatusToken tone="neutral">+{overflowMembers}</StatusToken>
                ) : null}
              </Stack>
            ) : null}

            <ViewAsUserButton />
            <NotificationsDropdown />
            {currentUser ? (
              <HeaderProfileButton
                userId={currentUser.id}
                name={workspaceProfile?.display_name ?? currentUser.name}
                avatarUrl={workspaceProfile?.avatar_url ?? currentUser.avatar_url}
                onClick={() => {
                  setProfileDrawerUser(null)
                  setProfileDrawerOpen(true)
                }}
              />
            ) : null}
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>{children}</Box>
      </Box>

      <UserLevelProfileDrawer
        open={profileDrawerOpen}
        onClose={() => {
          setProfileDrawerOpen(false)
          setProfileDrawerUser(null)
        }}
        userOverride={profileDrawerUser}
      />
    </Box>
    </DeliveryHeatMapProvider>
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
