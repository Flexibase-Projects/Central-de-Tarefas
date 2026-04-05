import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@/compat/mui/material'
import type { IndicatorsPersonalSummary } from '@/hooks/use-indicators'
import type { UserProgress } from '@/types'
import { ProfileGamificationShowcase } from './profile-gamification-showcase'

function IndicatorRow({ label, value, isLast }: { label: string; value: number; isLast?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 2,
        py: 0.75,
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

export interface ProfilePersonalPerformanceProps {
  indicatorsLoading: boolean
  indicatorsError: string | null
  personal: IndicatorsPersonalSummary | null
  progress: UserProgress | null
  progressLoading: boolean
}

export function ProfilePersonalPerformance({
  indicatorsLoading,
  indicatorsError,
  personal,
  progress,
  progressLoading,
}: ProfilePersonalPerformanceProps) {
  return (
    <Stack spacing={2}>
      <ProfileGamificationShowcase progress={progress} loading={progressLoading} />

      <Card variant="outlined">
        <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={800}>
              Seu desempenho
            </Typography>
            {indicatorsLoading ? <CircularProgress size={16} /> : null}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Indicadores operacionais neste workspace (to-dos, atividades e comentários).
          </Typography>
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
              Ainda não há linha sua na base de indicadores do time.
            </Typography>
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  )
}
