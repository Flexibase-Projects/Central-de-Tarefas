import { Avatar, Box, Button, CircularProgress, Typography } from '@/compat/mui/material'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useIndicators } from '@/hooks/use-indicators'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { useWorkspaceProfile } from '@/hooks/use-workspace-profile'
import { useProfileDrawerActions } from '@/hooks/use-profile-drawer-actions'
import { TierBadge } from '@/components/gamification/TierBadge'
import { DeliveryHeatAvatarWrap } from '@/components/gamification/DeliveryHeatAvatarWrap'
import { LevelXpBar } from '@/components/master-mode/LevelXpBar'
import { ExternalLink } from '@/components/ui/icons'
import SidePanel from '@/components/system/SidePanel'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'
function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <Box
      sx={{
        px: 1.25,
        py: 0.65,
        borderRadius: 'var(--radius-sm)',
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
        minWidth: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, mb: 0.15 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Box>
  )
}

function IndicatorRow({ label, value, isLast }: { label: string; value: number; isLast?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 2,
        py: 0.85,
        borderBottom: isLast ? 'none' : '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
        {value}
      </Typography>
    </Box>
  )
}

function formatInitials(name: string | null | undefined): string {
  const value = (name ?? '').trim()
  if (!value) return '?'
  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return `${parts[0][0]?.toUpperCase() ?? ''}${parts[1][0]?.toUpperCase() ?? ''}` || '?'
}

export interface UserLevelProfileDrawerProps {
  open: boolean
  onClose: () => void
  userOverride?: {
    id: string
    name: string
    email?: string | null
    avatar_url?: string | null
  } | null
}

export function UserLevelProfileDrawer({ open, onClose, userOverride = null }: UserLevelProfileDrawerProps) {
  const { currentUser, currentWorkspace } = useAuth()
  const workspaceSlug = currentWorkspace?.slug ?? null
  const { gamificationEnabled } = useWorkspaceContext(workspaceSlug)
  const { profile } = useWorkspaceProfile(workspaceSlug)
  const { goPerfil, goIndicadores, handleLogout } = useProfileDrawerActions({ onClose })

  const profileUser = userOverride ?? currentUser
  const isOwnProfile = !userOverride || userOverride.id === currentUser?.id
  const displayName = isOwnProfile ? profile?.display_name ?? currentUser?.name ?? '' : profileUser?.name ?? ''
  const avatarUrl = isOwnProfile ? profile?.avatar_url ?? currentUser?.avatar_url ?? null : profileUser?.avatar_url ?? null
  const { data: progress, loading: progressLoading } = useUserProgress(profileUser?.id, gamificationEnabled)
  const { data: indicators, loading: indicatorsLoading, error: indicatorsError } = useIndicators(
    profileUser?.id,
    'me',
    gamificationEnabled,
  )

  const personal = indicators?.personal ?? null
  const level = progress?.level ?? 1

  if (!profileUser) return null

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={isOwnProfile ? 'Perfil rápido' : `Perfil de ${profileUser.name}`}
      description={
        isOwnProfile
          ? 'Resumo do seu perfil na workspace atual.'
          : 'Visão rápida do progresso e dos indicadores desta pessoa na workspace atual.'
      }
      footer={
        isOwnProfile ? (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.25 }}>
            <Button variant="outlined" onClick={goIndicadores} startIcon={<ExternalLink size={16} />}>
              Indicadores
            </Button>
            <Button variant="contained" onClick={goPerfil}>
              Perfil completo
            </Button>
          </Box>
        ) : undefined
      }
    >
      <AppSurface sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DeliveryHeatAvatarWrap userId={profileUser.id} enabled={gamificationEnabled} size="md">
            <Avatar
              src={avatarUrl ?? undefined}
              sx={{
                width: 68,
                height: 68,
                fontSize: 24,
                fontWeight: 800,
                bgcolor: 'action.hover',
              }}
            >
              {formatInitials(displayName || profileUser.name)}
            </Avatar>
          </DeliveryHeatAvatarWrap>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h4" sx={{ mb: 0.3 }} noWrap>
              {displayName || profileUser.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: gamificationEnabled ? 0.9 : 0 }}>
              {profileUser.email ?? 'Membro do workspace'}
            </Typography>
            {gamificationEnabled ? <TierBadge level={level} size="sm" showTierName /> : null}
          </Box>
        </Box>
      </AppSurface>

      {gamificationEnabled ? (
        <AppSurface
          sx={{
            mb: 2,
            border: '1px solid',
            borderColor: 'divider',
            backgroundImage:
              'linear-gradient(145deg, color-mix(in srgb, var(--color-primary, #6366f1) 12%, transparent) 0%, color-mix(in srgb, var(--color-primary, #6366f1) 4%, transparent) 42%, transparent 72%)',
            boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--foreground, #fff) 6%, transparent)',
          }}
        >
          <SectionHeader title="Progressão" description="XP, nível e entregas." sx={{ pb: 1.25 }} />

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1.25,
              rowGap: 1,
              mb: 2,
              pb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, letterSpacing: '0.12em', color: 'text.secondary', textTransform: 'uppercase' }}
            >
              Nível
            </Typography>
            <Typography
              component="span"
              variant="h2"
              sx={{
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: 'text.primary',
              }}
            >
              {level}
            </Typography>
            <TierBadge level={level} size="md" showTierName />
          </Box>

          <LevelXpBar progress={progress} loading={progressLoading} hideTierRow />

          {progress ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 1,
                mt: 2,
                width: '100%',
              }}
            >
              <StatPill label="XP total" value={progress.totalXp} />
              <StatPill label="To-dos feitos" value={progress.completedTodos} />
              <StatPill label="Atividades" value={progress.completedActivities} />
              {progress.streakDays != null && progress.streakDays > 0 ? (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <StatPill label="Streak (dias)" value={progress.streakDays} />
                </Box>
              ) : null}
            </Box>
          ) : null}
        </AppSurface>
      ) : null}

      <AppSurface sx={{ mb: isOwnProfile ? 2 : 0 }}>
        <SectionHeader title="Indicadores" sx={{ pb: 1 }} actions={indicatorsLoading ? <CircularProgress size={16} /> : null} />

        {indicatorsError ? (
          <Typography variant="body2" color="error">
            {indicatorsError}
          </Typography>
        ) : personal ? (
          <Box>
            <IndicatorRow label="Comentários" value={personal.commentsCount} />
            <IndicatorRow label="To-dos atribuídos" value={personal.todosAssignedTotal} />
            <IndicatorRow label="To-dos concluídos" value={personal.todosAssignedCompleted} />
            <IndicatorRow label="To-dos pendentes" value={personal.todosAssignedOpen} />
            <IndicatorRow label="Atividades atribuídas" value={personal.activitiesAssigned} isLast />
          </Box>
        ) : !indicatorsLoading ? (
          <Typography variant="body2" color="text.secondary">
            Ainda não há linha sua na tabela de indicadores do time.
          </Typography>
        ) : null}
      </AppSurface>

      {isOwnProfile ? (
        <AppSurface surface="subtle" sx={{ py: 1.25 }}>
          <Button fullWidth variant="text" color="error" onClick={handleLogout}>
            Desconectar
          </Button>
        </AppSurface>
      ) : null}
    </SidePanel>
  )
}
