import type { ElementType } from 'react'
import { Box, Card, CardContent, CircularProgress, Stack, Typography, useTheme } from '@/compat/mui/material'
import { alpha } from '@/compat/mui/styles'
import { TierBadge } from '@/components/gamification/TierBadge'
import { LevelXpBar } from '@/components/master-mode/LevelXpBar'
import { Flag, Sparkles, TaskAlt, Trophy } from '@/components/ui/icons'
import type { UserProgress } from '@/types'
import { getTierForLevel } from '@/utils/tier'

function MiniStat({ icon: Icon, label, value, accent }: { icon: ElementType; label: string; value: number; accent: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 0.85,
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha(accent, 0.35),
        bgcolor: alpha(accent, 0.08),
        flex: '1 1 auto',
        minWidth: { xs: 'calc(50% - 6px)', sm: 140 },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          color: accent,
          bgcolor: alpha(accent, 0.15),
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.15 }}>
          {value.toLocaleString('pt-BR')}
        </Typography>
      </Box>
    </Box>
  )
}

export interface ProfileGamificationShowcaseProps {
  progress: UserProgress | null
  loading: boolean
}

export function ProfileGamificationShowcase({ progress, loading }: ProfileGamificationShowcaseProps) {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'

  if (loading) {
    return (
      <Card variant="outlined" sx={{ mb: 0 }}>
        <CardContent sx={{ py: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={22} />
          <Typography variant="body2" color="text.secondary">
            Carregando sua progressão...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (!progress) {
    return (
      <Card variant="outlined" sx={{ mb: 0 }}>
        <CardContent sx={{ py: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Gamificação desativada ou dados de progresso indisponíveis neste workspace.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const tier = getTierForLevel(progress.level)
  const accent = tier.color
  const streak = progress.streakDays ?? 0

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderColor: alpha(accent, isLight ? 0.4 : 0.5),
        background:
          theme.palette.mode === 'light'
            ? `linear-gradient(145deg, ${alpha(accent, 0.14)} 0%, ${theme.palette.background.paper} 42%, ${alpha(accent, 0.06)} 100%)`
            : `linear-gradient(145deg, ${alpha(accent, 0.22)} 0%, ${theme.palette.background.paper} 48%, ${alpha(accent, 0.1)} 100%)`,
        boxShadow: `0 0 0 1px ${alpha(accent, 0.12)}, 0 16px 48px -12px ${alpha(accent, isLight ? 0.35 : 0.45)}`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -48,
          right: -32,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(accent, 0.35)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -24,
          left: -24,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(accent, 0.2)} 0%, transparent 68%)`,
          pointerEvents: 'none',
        }}
      />

      <CardContent sx={{ position: 'relative', p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 36,
              height: 36,
              borderRadius: 2,
              color: accent,
              bgcolor: alpha(accent, 0.18),
              boxShadow: `0 0 20px ${alpha(accent, 0.35)}`,
            }}
          >
            <Sparkles size={20} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                lineHeight: 1.2,
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: accent,
              }}
            >
              Sua jornada no workspace
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Suba de nível, acumule XP e mantenha o ritmo.
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ mb: 2 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <Box sx={{ textAlign: 'center', minWidth: 88 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
                NÍVEL
              </Typography>
              <Typography
                component="div"
                sx={{
                  fontSize: { xs: '2.75rem', sm: '3.25rem' },
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  ...(tier.gradient
                    ? {
                        backgroundImage: tier.gradient,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        WebkitTextFillColor: 'transparent',
                      }
                    : {
                        color: accent,
                        textShadow: `0 0 32px ${alpha(accent, 0.5)}, 0 2px 14px ${alpha(accent, 0.22)}`,
                      }),
                }}
              >
                {progress.level}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 4,
                alignSelf: 'stretch',
                minHeight: 56,
                borderRadius: 2,
                background: `linear-gradient(180deg, ${accent} 0%, ${alpha(accent, 0.2)} 100%)`,
                display: { xs: 'none', sm: 'block' },
              }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ mb: 0.75 }}>
              <TierBadge level={progress.level} size="md" showTierName />
            </Box>
            <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
              <Trophy size={16} style={{ color: accent, opacity: 0.9 }} />
              <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '-0.02em' }}>
                {progress.totalXp.toLocaleString('pt-BR')}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={700}>
                XP total
              </Typography>
            </Stack>
          </Box>
        </Stack>

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            mb: 2,
            border: '1px solid',
            borderColor: alpha(accent, 0.25),
            bgcolor: alpha(accent, isLight ? 0.06 : 0.1),
          }}
        >
          <LevelXpBar progress={progress} hideTierRow />
        </Box>

        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 1, letterSpacing: '0.06em' }}>
          CONQUISTAS RÁPIDAS
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <MiniStat icon={TaskAlt} label="To-dos concluídos" value={progress.completedTodos} accent={accent} />
          <MiniStat icon={Flag} label="Atividades feitas" value={progress.completedActivities} accent={accent} />
          {streak > 0 ? <MiniStat icon={Sparkles} label="Sequência (dias)" value={streak} accent="#F59E0B" /> : null}
        </Box>
      </CardContent>
    </Card>
  )
}
