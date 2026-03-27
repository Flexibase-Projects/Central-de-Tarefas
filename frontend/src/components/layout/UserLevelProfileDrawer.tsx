import React from 'react'
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useIndicators } from '@/hooks/use-indicators'
import { useProfileDrawerActions } from '@/hooks/use-profile-drawer-actions'
import { TierBadge } from '@/components/gamification/TierBadge'
import { LevelXpBar } from '@/components/master-mode/LevelXpBar'
import { Person, BarChart2, ExternalLink, MessageCircleIcon, List, CheckCircle, ClipboardList } from '@/components/ui/icons'
import SidePanel from '@/components/system/SidePanel'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <AppSurface compact surface="subtle" sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          bgcolor: 'action.hover',
          color: 'primary.main',
        }}
      >
        <Icon size={16} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.2 }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
          {value}
        </Typography>
      </Box>
    </AppSurface>
  )
}

export interface UserLevelProfileDrawerProps {
  open: boolean
  onClose: () => void
}

export function UserLevelProfileDrawer({ open, onClose }: UserLevelProfileDrawerProps) {
  const { currentUser } = useAuth()
  const { goPerfil, goIndicadores, goWorkspaces, handleLogout } = useProfileDrawerActions({ onClose })
  const { data: progress, loading: progressLoading } = useUserProgress()
  const { data: indicators, loading: indicatorsLoading, error: indicatorsError } = useIndicators()

  const personal = indicators?.personal ?? null

  if (!currentUser) return null

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Perfil rapido"
      description="Resumo do seu progresso e dos seus indicadores no workspace atual."
      footer={
        <>
          <Button variant="text" onClick={goWorkspaces}>
            Workspaces
          </Button>
          <Button variant="outlined" onClick={goIndicadores} startIcon={<ExternalLink size={16} />}>
            Indicadores
          </Button>
          <Button variant="contained" onClick={goPerfil}>
            Perfil completo
          </Button>
        </>
      }
    >
      <AppSurface sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={currentUser.avatar_url ?? undefined}
            sx={{
              width: 68,
              height: 68,
              fontSize: 24,
              fontWeight: 800,
              bgcolor: 'action.hover',
            }}
          >
            {currentUser.name?.[0]?.toUpperCase() ?? <Person size={30} />}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h4" sx={{ mb: 0.3 }} noWrap>
              {currentUser.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 0.9 }}>
              {currentUser.email}
            </Typography>
            <TierBadge level={progress?.level ?? 1} size="sm" showTierName />
          </Box>
        </Box>
      </AppSurface>

      <AppSurface sx={{ mb: 2 }}>
        <SectionHeader
          title="Progressao"
          description="Nivel, XP e entregas concluidas."
          sx={{ pb: 1 }}
        />

        <LevelXpBar progress={progress} loading={progressLoading} />

        {progress ? (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              <strong style={{ color: 'var(--text-primary)' }}>{progress.totalXp}</strong> XP total
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <strong style={{ color: 'var(--text-primary)' }}>{progress.completedTodos}</strong> to-dos
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <strong style={{ color: 'var(--text-primary)' }}>{progress.completedActivities}</strong> atividades
            </Typography>
            {progress.streakDays != null && progress.streakDays > 0 ? (
              <Typography variant="caption" color="text.secondary">
                <strong style={{ color: 'var(--text-primary)' }}>{progress.streakDays}</strong> dias de streak
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </AppSurface>

      <AppSurface>
        <SectionHeader
          title="Indicadores"
          description="Recorte da sua atividade recente."
          sx={{ pb: 1 }}
          actions={indicatorsLoading ? <CircularProgress size={16} /> : null}
        />

        {indicatorsError ? (
          <Typography variant="body2" color="error">
            {indicatorsError}
          </Typography>
        ) : personal ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <StatTile icon={MessageCircleIcon} label="Comentarios" value={personal.commentsCount} />
            <StatTile icon={List} label="To-dos atribuidos" value={personal.todosAssignedTotal} />
            <StatTile icon={CheckCircle} label="To-dos concluidos" value={personal.todosAssignedCompleted} />
            <StatTile icon={ClipboardList} label="To-dos pendentes" value={personal.todosAssignedOpen} />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <StatTile icon={BarChart2} label="Atividades atribuidas" value={personal.activitiesAssigned} />
            </Box>
          </Box>
        ) : !indicatorsLoading ? (
          <Typography variant="body2" color="text.secondary">
            Ainda nao ha linha sua na tabela de indicadores do time.
          </Typography>
        ) : null}

        <Divider sx={{ my: 2 }} />

        <Button fullWidth variant="text" color="error" onClick={handleLogout}>
          Desconectar
        </Button>
      </AppSurface>
    </SidePanel>
  )
}
