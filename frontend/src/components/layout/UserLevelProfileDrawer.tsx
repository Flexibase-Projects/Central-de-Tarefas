import React, { useMemo } from 'react'
import {
  Box,
  Drawer,
  Typography,
  Avatar,
  LinearProgress,
  IconButton,
  Divider,
  Button,
  CircularProgress,
  useTheme,
} from '@mui/material'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useIndicators } from '@/hooks/use-indicators'
import { getTierForLevel } from '@/utils/tier'
import { TierBadge } from '@/components/gamification/TierBadge'
import { Person, BarChart2, ExternalLink, MessageCircleIcon, List, CheckCircle, ClipboardList } from '@/components/ui/icons'
import type { UserIndicator } from '@/types'

function StatTile({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ElementType
  label: string
  value: number
  iconColor: string
}) {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        p: 1.25,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isLight ? 'divider' : 'rgba(255,255,255,0.08)',
        bgcolor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.28)',
        transition: 'border-color 0.15s, background-color 0.15s',
        '&:hover': {
          borderColor: isLight ? 'primary.main' : 'rgba(88,101,242,0.45)',
          bgcolor: isLight ? 'rgba(37,99,235,0.04)' : 'rgba(88,101,242,0.08)',
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          bgcolor: isLight ? `${iconColor}14` : `${iconColor}22`,
          color: iconColor,
        }}
      >
        <Icon size={18} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: 'text.secondary',
            display: 'block',
            mb: 0.25,
          }}
        >
          {label}
        </Typography>
        <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  )
}

export interface UserLevelProfileDrawerProps {
  open: boolean
  onClose: () => void
}

export function UserLevelProfileDrawer({ open, onClose }: UserLevelProfileDrawerProps) {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { data: progress, loading: progressLoading } = useUserProgress()
  const { data: indicators, loading: indicatorsLoading, error: indicatorsError } = useIndicators()

  const tier = progress ? getTierForLevel(progress.level) : getTierForLevel(1)
  const xpPercent = progress
    ? Math.min(100, ((progress.xpInCurrentLevel ?? 0) / Math.max(1, progress.xpForNextLevel ?? 1)) * 100)
    : 0

  const myRow = useMemo<UserIndicator | null>(() => {
    if (!currentUser?.id || !indicators?.by_user) return null
    return indicators.by_user.find((u) => u.user_id === currentUser.id) ?? null
  }, [currentUser?.id, indicators?.by_user])

  const panelBg = isLight ? theme.palette.background.paper : '#1e1f22'
  const bannerGradient = isLight
    ? `linear-gradient(135deg, ${tier.color}35 0%, ${theme.palette.primary.main}28 50%, ${tier.color}20 100%)`
    : `linear-gradient(125deg, ${tier.color}55 0%, #1b2838 35%, #171a21 70%, ${tier.color}25 100%)`

  const goPerfil = () => {
    onClose()
    navigate('/perfil')
  }

  const goIndicadores = () => {
    onClose()
    navigate('/indicadores')
  }

  if (!currentUser) return null

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 400 },
            maxWidth: '100vw',
            zIndex: (t) => t.zIndex.drawer + 2,
            bgcolor: panelBg,
            borderLeft: '1px solid',
            borderColor: isLight ? 'divider' : 'rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Steam-style banner + Discord-style dense header */}
      <Box
        sx={{
          position: 'relative',
          flexShrink: 0,
          background: bannerGradient,
          borderBottom: '1px solid',
          borderColor: isLight ? 'divider' : 'rgba(255,255,255,0.06)',
          pt: 2,
          pb: 2.5,
          px: 2,
        }}
      >
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: isLight ? 'text.secondary' : 'rgba(255,255,255,0.7)',
            bgcolor: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.35)',
            '&:hover': { bgcolor: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.5)' },
          }}
          aria-label="Fechar"
        >
          <X size={18} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, pr: 4 }}>
          <Avatar
            src={currentUser.avatar_url ?? undefined}
            sx={{
              width: 88,
              height: 88,
              fontSize: 34,
              fontWeight: 800,
              border: '3px solid',
              borderColor: isLight ? 'background.paper' : '#2b2d31',
              boxShadow: `0 0 0 2px ${tier.color}88, 0 8px 24px rgba(0,0,0,0.35)`,
              bgcolor: isLight ? 'primary.light' : 'primary.dark',
            }}
          >
            {currentUser.name?.[0]?.toUpperCase() ?? <Person size={40} />}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0, pb: 0.5 }}>
            <Typography variant="h6" fontWeight={800} noWrap sx={{ letterSpacing: '-0.02em', textShadow: isLight ? 'none' : '0 1px 8px rgba(0,0,0,0.5)' }}>
              {currentUser.name}
            </Typography>
            <Typography
              variant="caption"
              color={isLight ? 'text.secondary' : 'rgba(255,255,255,0.55)'}
              noWrap
              display="block"
              sx={{ mb: 0.75 }}
            >
              {currentUser.email}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <TierBadge level={progress?.level ?? 1} size="sm" showTierName />
            </Box>
          </Box>

          {/* Steam-style level badge */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(145deg, ${tier.color}dd, ${tier.color}88)`,
              border: '2px solid',
              borderColor: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
              boxShadow: `0 0 16px ${tier.glowColor}`,
            }}
          >
            <Typography variant="h5" fontWeight={900} sx={{ color: '#fff', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
              {progress?.level ?? 1}
            </Typography>
            <Typography sx={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}>
              LVL
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
        <Typography
          variant="overline"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            color: 'text.secondary',
            display: 'block',
            mb: 1,
          }}
        >
          Progressão
        </Typography>

        {progressLoading && !progress ? (
          <LinearProgress sx={{ borderRadius: 1, mb: 2 }} />
        ) : progress ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {progress.xpInCurrentLevel} / {progress.xpForNextLevel} XP
              </Typography>
              <Typography variant="caption" sx={{ color: tier.color, fontWeight: 700 }}>
                {Math.round(xpPercent)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={xpPercent}
              sx={{
                height: 8,
                borderRadius: 999,
                mb: 1,
                bgcolor: isLight ? 'action.hover' : 'rgba(255,255,255,0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${tier.color}aa, ${tier.color})`,
                  boxShadow: `0 0 10px ${tier.glowColor}`,
                },
              }}
            />
            {progress.streakDays != null && progress.streakDays > 0 && (
              <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 700, display: 'block', mb: 2 }}>
                🔥 {progress.streakDays} dias de streak
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                <strong style={{ color: theme.palette.text.primary }}>{progress.totalXp}</strong> XP total
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <strong style={{ color: theme.palette.text.primary }}>{progress.completedTodos}</strong> to-dos ·{' '}
                <strong style={{ color: theme.palette.text.primary }}>{progress.completedActivities}</strong> atividades
              </Typography>
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Progresso indisponível no momento.
          </Typography>
        )}

        <Divider sx={{ my: 2, borderColor: isLight ? undefined : 'rgba(255,255,255,0.06)' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography
            variant="overline"
            sx={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              color: 'text.secondary',
            }}
          >
            Indicadores · você
          </Typography>
          {indicatorsLoading && <CircularProgress size={18} thickness={5} />}
        </Box>

        {indicatorsError ? (
          <Typography variant="caption" color="error">
            {indicatorsError}
          </Typography>
        ) : myRow ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <StatTile icon={MessageCircleIcon} label="Comentários" value={myRow.comments_count} iconColor="#5865F2" />
            <StatTile icon={List} label="TO-DOs criados" value={myRow.todos_created} iconColor="#3BA55D" />
            <StatTile icon={CheckCircle} label="TO-DOs concluídos" value={myRow.todos_completed} iconColor="#57F287" />
            <StatTile icon={ClipboardList} label="Ativ. criadas" value={myRow.activities_created} iconColor="#F59E0B" />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <StatTile icon={BarChart2} label="Atividades atribuídas" value={myRow.activities_assigned} iconColor="#00BFFF" />
            </Box>
          </Box>
        ) : !indicatorsLoading ? (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Ainda não há linha sua na tabela de indicadores do time. Continue usando a Central — os números aparecem em{' '}
            <Button size="small" onClick={goIndicadores} sx={{ textTransform: 'none', p: 0, minWidth: 0, verticalAlign: 'baseline' }}>
              Indicadores
            </Button>
            .
          </Typography>
        ) : null}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          p: 2,
          pt: 1,
          borderTop: '1px solid',
          borderColor: isLight ? 'divider' : 'rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          bgcolor: isLight ? 'action.hover' : 'rgba(0,0,0,0.25)',
        }}
      >
        <Button fullWidth variant="contained" onClick={goPerfil} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}>
          Perfil completo
        </Button>
        <Button
          fullWidth
          variant="outlined"
          onClick={goIndicadores}
          startIcon={<ExternalLink size={16} />}
          sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 2 }}
        >
          Indicadores do time
        </Button>
      </Box>
    </Drawer>
  )
}
