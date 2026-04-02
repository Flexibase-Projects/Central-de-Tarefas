import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { useAuth } from '@/contexts/AuthContext'

export default function Ranking() {
  const { currentWorkspace } = useAuth()
  const { gamificationEnabled, rankingEnabled } = useWorkspaceContext(currentWorkspace?.slug ?? null)
  const available = gamificationEnabled && rankingEnabled

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Box sx={{ maxWidth: 880, mx: 'auto' }}>
        <Stack spacing={0.75} sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800}>
            Ranking
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ferramenta central de gamificação do workspace.
          </Typography>
        </Stack>

        {available ? (
          <Card variant="outlined">
            <CardContent
              sx={{
                minHeight: 320,
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                p: 4,
              }}
            >
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
                  Em Desenvolvimento
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A estrutura visual do Ranking já está reservada para esta workspace.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="warning">
            Esta workspace não tem gamificação ativa. O Ranking continua visível, mas fica indisponível até a
            funcionalidade ser habilitada.
          </Alert>
        )}
      </Box>
    </Box>
  )
}
