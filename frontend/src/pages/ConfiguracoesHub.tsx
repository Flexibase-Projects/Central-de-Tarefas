import type { ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Chip,
} from '@mui/material'
import { usePermissions } from '@/hooks/use-permissions'
import { Settings, Security } from '@/components/ui/icons'

type HubCard = {
  key: string
  title: string
  description: string
  to: string
  adminOnly: boolean
  icon: ElementType
}

const CARDS: HubCard[] = [
  {
    key: 'administracao',
    title: 'Administração',
    description: 'Usuários, cargos, permissões e conquistas do sistema.',
    to: '/configuracoes/administracao',
    adminOnly: true,
    icon: Security,
  },
]

export default function ConfiguracoesHub() {
  const navigate = useNavigate()
  const { hasRole } = usePermissions()
  const isAdmin = hasRole('admin')
  const visible = CARDS.filter((c) => !c.adminOnly || isAdmin)

  return (
    <Box sx={{ p: 3, maxWidth: 960 }}>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.08)'),
            color: 'primary.main',
          }}
        >
          <Settings size={22} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
            Visão geral
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Escolha uma área de configuração. Itens administrativos exigem o cargo Administrador.
          </Typography>
        </Box>
      </Stack>

      {visible.length === 0 ? (
        <Card variant="outlined" sx={{ mt: 3, borderRadius: 2, borderStyle: 'dashed' }}>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Nenhuma configuração adicional disponível para o seu perfil.
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Dúvidas? Fale com um administrador da Central de Tarefas.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2} sx={{ mt: 3 }}>
          {visible.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.key}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: (t) => (t.palette.mode === 'light' ? '0 8px 24px rgba(15,23,42,0.08)' : 8),
                  },
                }}
              >
                <CardActionArea onClick={() => navigate(card.to)} sx={{ alignItems: 'stretch' }}>
                  <CardContent sx={{ display: 'flex', gap: 2, py: 2.5 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1.5,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                      }}
                    >
                      <Icon size={22} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {card.title}
                        </Typography>
                        {card.adminOnly && (
                          <Chip label="Administrador" size="small" color="primary" variant="outlined" sx={{ height: 22 }} />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                        {card.description}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
