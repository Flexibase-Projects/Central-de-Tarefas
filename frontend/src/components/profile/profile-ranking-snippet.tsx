import { Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@/compat/mui/material'
import { Trophy } from '@/components/ui/icons'
import type { WorkspaceRankingData } from '@/types'

function getUnavailableMessage(reason?: string | null): string {
  switch (reason) {
    case 'not_configured':
      return 'O ranking ainda não foi habilitado neste workspace.'
    default:
      return 'A gamificação deste workspace está indisponível no momento.'
  }
}

export interface ProfileRankingSnippetProps {
  loading: boolean
  available: boolean
  reason: string | null | undefined
  ranking: WorkspaceRankingData | null | undefined
  onGoRanking: () => void
}

export function ProfileRankingSnippet({
  loading,
  available,
  reason,
  ranking,
  onGoRanking,
}: ProfileRankingSnippetProps) {
  if (loading) {
    return (
      <Card variant="outlined" sx={{ mb: 2.5 }}>
        <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Carregando ranking...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (!available || !ranking) {
    return (
      <Card variant="outlined" sx={{ mb: 2.5 }}>
        <CardContent sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {getUnavailableMessage(reason)}
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const me = ranking.current_user
  const gap = ranking.gap_to_next

  return (
    <Card variant="outlined" sx={{ mb: 2.5 }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Trophy size={17} style={{ color: '#F59E0B' }} />
          <Typography variant="subtitle1" fontWeight={800}>
            Resumo do ranking
          </Typography>
        </Stack>

        <Box sx={{ mb: 1.5 }}>
          {me ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Sua posição
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                #{me.position} de {ranking.total_members} membros
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                Nível {me.level} · {me.total_xp.toLocaleString('pt-BR')} XP
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Você ainda não aparece no ranking deste workspace.
            </Typography>
          )}
        </Box>

        {gap && me && me.position > 1 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Faltam {gap.xp_difference.toLocaleString('pt-BR')} XP para alcançar {gap.name} (#{gap.position}).
          </Typography>
        ) : null}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {ranking.active_with_xp} membros ativos com XP · média {ranking.average_level} nível
        </Typography>

        <Button variant="contained" size="small" onClick={onGoRanking}>
          Ver ranking completo
        </Button>
      </CardContent>
    </Card>
  )
}
