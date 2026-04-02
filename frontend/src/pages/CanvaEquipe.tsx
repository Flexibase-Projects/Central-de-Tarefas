import { Box, Chip, Stack, Typography } from '@/compat/mui/material'

export default function CanvaEquipe() {
  return (
    <Box
      sx={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, md: 4 },
        py: 4,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 720,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
          boxShadow: 1,
          p: { xs: 3, md: 4 },
        }}
      >
        <Stack spacing={2.5}>
          <Chip
            label="Temporariamente indisponivel"
            color="warning"
            variant="outlined"
            sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
          />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Canva em equipe em manutencao preventiva
          </Typography>
          <Typography color="text.secondary">
            Esta area foi desativada temporariamente enquanto concluimos a remediacao de dependencias
            de desenho colaborativo que ainda carregavam vulnerabilidades em runtime.
          </Typography>
          <Typography color="text.secondary">
            O restante da plataforma segue operacional. Quando a cadeia de dependencias estiver segura,
            a funcionalidade volta com a mesma rota e sem impacto nos outros modulos.
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
