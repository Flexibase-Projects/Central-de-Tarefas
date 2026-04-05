import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
} from '@/compat/mui/material'
import { BarChart2 } from '@/components/ui/icons'
import type { WorkspaceTeamGamificationMember, WorkspaceTeamGamificationSummaryState } from '@/types'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function TeamStatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <Box
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minWidth: 0,
      }}
    >
      <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
        {label}
      </Typography>
    </Box>
  )
}

function buildChartData(members: WorkspaceTeamGamificationMember[]) {
  const maxXp = Math.max(...members.map((m) => m.total_xp), 1)
  return members.map((m) => ({
    key: m.user_id,
    name: m.name.length > 16 ? `${m.name.slice(0, 14)}…` : m.name,
    fullName: m.name,
    xp: m.total_xp,
    pct: maxXp > 0 ? Math.round((m.total_xp / maxXp) * 100) : 0,
  }))
}

export interface ProfileTeamGamificationSummaryProps {
  profileLoading: boolean
  teamGamificationSummary: WorkspaceTeamGamificationSummaryState | null | undefined
}

export function ProfileTeamGamificationSummary({
  profileLoading,
  teamGamificationSummary,
}: ProfileTeamGamificationSummaryProps) {
  const theme = useTheme()
  const primary = theme.palette.primary.main
  const topMembers = teamGamificationSummary?.summary?.top_members ?? []
  const chartData = buildChartData(topMembers)

  return (
    <Card variant="outlined" sx={{ mb: 2.5 }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
          <BarChart2 size={17} />
          <Typography variant="subtitle1" fontWeight={800}>
            Resumo da gamificação do time
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Visão compacta para perfil gerencial: métricas agregadas e desempenho relativo (XP) entre os principais membros.
        </Typography>

        {profileLoading ? (
          <Box sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Carregando resumo do time...
            </Typography>
          </Box>
        ) : !teamGamificationSummary?.enabled ? (
          <Alert severity="info" sx={{ py: 0.75 }}>
            A gamificação está desativada neste workspace.
          </Alert>
        ) : teamGamificationSummary?.summary ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: 1,
                mb: 1.5,
              }}
            >
              <TeamStatPill label="Membros" value={teamGamificationSummary.summary.total_members} />
              <TeamStatPill label="Ativos com XP" value={teamGamificationSummary.summary.active_with_xp} />
              <TeamStatPill label="Nível médio" value={teamGamificationSummary.summary.average_level} />
              <TeamStatPill label="XP médio" value={teamGamificationSummary.summary.average_xp} />
            </Box>

            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              Desempenho relativo (top {chartData.length || '—'})
            </Typography>
            {chartData.length > 0 ? (
              <Box sx={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={chartData} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={108}
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(value: number, _name: string, item: { payload?: { xp?: number; fullName?: string } }) => {
                        const xp = item.payload?.xp
                        const label = item.payload?.fullName ?? 'Membro'
                        return [`${xp != null ? xp.toLocaleString('pt-BR') : '—'} XP (${value}% do topo)`, label]
                      }}
                    />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.key} fill={primary} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sem dados de membros para comparar ainda.
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Conquistas desbloqueadas (time):{' '}
              <strong>{teamGamificationSummary.summary.total_unlocked_achievements}</strong>
            </Typography>
          </>
        ) : (
          <Alert severity="info" sx={{ py: 0.75 }}>
            Nenhum resumo disponível para este workspace no momento.
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
