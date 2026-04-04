import { useMemo } from 'react'
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  LayoutGrid,
  Network,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { Box, Button, Stack, Typography } from '@/compat/mui/material'
import { alpha, type Theme } from '@/compat/mui/styles'
import AppSurface from '@/components/system/AppSurface'

export type WorkspacePublicLandingProps = {
  workspaceCount: number
  groupCount: number
  onAccessWorkspaces: () => void
  onAdminAccess: () => void
}

type FeatureItem = { icon: LucideIcon; title: string; description: string }

const FEATURES: FeatureItem[] = [
  {
    icon: LayoutGrid,
    title: 'Projetos e fluxo visual',
    description: 'Quadros e colaboracao para acompanhar entregas sem perder o contexto da area.',
  },
  {
    icon: ClipboardCheck,
    title: 'Atividades e to-dos',
    description: 'Execucao diaria concentrada com prazos, responsaveis e historico no mesmo ambiente.',
  },
  {
    icon: BarChart3,
    title: 'Indicadores',
    description: 'Leitura gerencial alinhada ao que a equipe realmente esta movendo no chao de fabrica.',
  },
  {
    icon: Network,
    title: 'Organograma e custos',
    description: 'Visoes estruturais e financeiras quando o workspace libera modulos de gestao.',
  },
  {
    icon: Trophy,
    title: 'Gamificacao',
    description: 'XP, niveis e conquistas para dar ritmo e visibilidade ao progresso coletivo.',
  },
  {
    icon: Building2,
    title: 'Configuracao por workspace',
    description: 'Modulos, permissoes e identidade proprios — cada departamento no seu contexto.',
  },
]

function FeatureCard({
  feature: { icon: Icon, title, description },
  index,
}: {
  feature: FeatureItem
  index: number
}) {
  return (
    <Box
      sx={(theme: Theme) => ({
        position: 'relative',
        height: '100%',
        p: 2.5,
        borderRadius: 'var(--radius-md)',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.45 : 0.97),
        backgroundImage: `linear-gradient(155deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.06)} 0%, transparent 48%)`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? `0 4px 24px ${alpha('#000', 0.22)}`
            : `0 8px 30px ${alpha(theme.palette.primary.main, 0.06)}, 0 1px 3px ${alpha('#000', 0.04)}`,
        overflow: 'hidden',
        animation: `cdtFeatureIn 0.65s ease backwards`,
        animationDelay: `${Math.min(index, 8) * 0.07}s`,
        transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease, border-color 0.35s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          opacity: 0,
          transition: 'opacity 0.45s ease',
          background: `radial-gradient(120% 80% at 10% -20%, ${alpha(theme.palette.primary.main, 0.14)}, transparent 55%)`,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '12%',
          right: '12%',
          height: 2,
          borderRadius: '0 0 8px 8px',
          background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, transparent)`,
          opacity: theme.palette.mode === 'dark' ? 0.55 : 0.4,
        },
        '&:hover': {
          transform: 'translateY(-8px)',
          borderColor: alpha(theme.palette.primary.main, 0.42),
          boxShadow:
            theme.palette.mode === 'dark'
              ? `0 22px 48px ${alpha('#000', 0.38)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)}`
              : `0 24px 48px ${alpha(theme.palette.primary.main, 0.12)}, 0 12px 24px ${alpha('#000', 0.06)}`,
          '&::before': { opacity: 1 },
          '& .feature-icon': {
            transform: 'scale(1.08) rotate(-3deg)',
            boxShadow: `0 10px 28px ${alpha(theme.palette.primary.main, 0.22)}`,
          },
        },
      })}
    >
      <Stack spacing={1.5} sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          className="feature-icon"
          sx={(theme: Theme) => ({
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12)}, ${alpha(theme.palette.primary.main, 0.04)})`,
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.22),
            color: 'primary.main',
            transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.45s ease',
          })}
        >
          <Icon size={22} strokeWidth={1.65} />
        </Box>
        <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.02em', fontSize: '1.02rem' }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {description}
        </Typography>
      </Stack>
    </Box>
  )
}

export function WorkspacePublicLanding({
  workspaceCount,
  groupCount,
  onAccessWorkspaces,
  onAdminAccess,
}: WorkspacePublicLandingProps) {
  const statItems = useMemo(
    () =>
      [
        {
          key: 'groups' as const,
          value: groupCount > 0 ? String(groupCount) : '—',
          label: 'Familias no catalogo',
          detail:
            groupCount > 0
              ? `Hoje existem ${groupCount} ${groupCount === 1 ? 'familia agrupando' : 'familias agrupando'} workspaces por area de negocio ou produto — o visitante acha o sistema certo sem varrer listas longas nem adivinhar siglas.`
              : 'O catalogo organiza entradas por familia; assim que houver dados publicos, o numero aparece aqui e reflete o recorte vivo do ambiente.',
        },
        {
          key: 'workspaces' as const,
          value: workspaceCount > 0 ? String(workspaceCount) : '—',
          label: 'Workspaces publicados',
          detail:
            workspaceCount > 0
              ? `${workspaceCount} ${workspaceCount === 1 ? 'contexto pronto' : 'contextos prontos'} para fluxo guiado: cada workspace carrega modulos, identidade e permissoes proprias, alinhadas ao departamento.`
              : 'Novos contextos nascem pela equipe interna de tecnologia; o indicador mostra apenas o que ja esta exposto de forma segura ao usuario final.',
        },
        {
          key: 'context' as const,
          value: '100%',
          label: 'Login apos escolha',
          detail:
            'Fluxo intencional: primeiro o visitante fixa o workspace, so entra credencial — reduz acesso na filial errada, suporte repetitivo e confusao de permissoes entre areas.',
        },
        {
          key: 'theme' as const,
          value: '2',
          label: 'Temas prontos',
          detail:
            'Claro e escuro compartilham a mesma arquitetura de tokens de cor, espacamento e tipo — leitura consistente em qualquer turno, sem “segundo produto” visual.',
        },
      ] as const,
    [groupCount, workspaceCount],
  )

  return (
    <Stack spacing={{ xs: 5, md: 6 }}>
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 360, md: 400 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          pb: { xs: 2, md: 3 },
          overflow: 'visible',
          bgcolor: 'transparent',
        }}
      >
        <Stack
          alignItems="center"
          spacing={2}
          sx={{
            position: 'relative',
            zIndex: 3,
            textAlign: 'center',
            px: { xs: 2.5, md: 4 },
            pt: { xs: 10, md: 12 },
            maxWidth: 640,
          }}
        >
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.03em',
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
              lineHeight: 1.08,
              textShadow: (t: Theme) =>
                t.palette.mode === 'dark' ? `0 2px 36px ${alpha(t.palette.common.black, 0.45)}` : 'none',
            }}
          >
            Central de Tarefas
          </Typography>

          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1.75,
              py: 0.5,
              borderRadius: 999,
              border: '1px solid',
              borderColor: (t: Theme) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.45 : 0.35),
              bgcolor: (t: Theme) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.08),
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 11 }}
            >
              Flexibase
            </Typography>
          </Box>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              maxWidth: 520,
              lineHeight: 1.65,
              fontSize: { xs: '0.94rem', md: '1rem' },
            }}
          >
            Faça sua workspace ser única para otimizar o desempenho do seu departamento
          </Typography>

          <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 360, pt: 1 }} alignItems="center">
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={onAccessWorkspaces}
              sx={{ py: 1.35, fontWeight: 700, textTransform: 'none', fontSize: '1rem' }}
            >
              Acessar workspaces
            </Button>
            <Typography
              component="button"
              type="button"
              variant="body2"
              onClick={onAdminAccess}
              sx={{
                width: '100%',
                minHeight: 48,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                bgcolor: 'transparent',
                background: 'none',
                cursor: 'pointer',
                color: 'text.secondary',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                borderRadius: 1,
                '&:hover': {
                  color: 'text.primary',
                  bgcolor: 'transparent',
                  backgroundColor: 'transparent',
                },
              }}
            >
              Acesso administrativo
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Box
        component="section"
        sx={{
          '@keyframes cdtSectionTag': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.06)' },
          },
          '@keyframes cdtFeatureIn': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} justifyContent="center">
          <Box sx={{ animation: 'cdtSectionTag 4s ease-in-out infinite', display: 'flex' }}>
            <Sparkles size={18} style={{ opacity: 0.85 }} />
          </Box>
          <Typography variant="h5" fontWeight={800} textAlign="center">
            Funcionalidades da plataforma
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 560, mx: 'auto', mb: 3.5 }}>
          Recursos pensados para operacao, gestao e engajamento dentro de um unico ecossistema por workspace.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </Box>
      </Box>

      <Box
        component="section"
        sx={{
          '@keyframes cdtStatIn': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Typography variant="h5" fontWeight={800} textAlign="center" sx={{ mb: 1 }}>
          Por que confiar nesta base
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 520, mx: 'auto', mb: 2.5 }}>
          Numeros vivos do ambiente e principios de produto que sustentam o dia a dia.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 1.25, md: 1.5 },
          }}
        >
          {statItems.map((item, index) => (
            <Box
              key={item.key}
              sx={(theme: Theme) => ({
                p: { xs: 1.35, sm: 1.5 },
                textAlign: 'center',
                borderRadius: 'var(--radius-md)',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.4 : 0.95),
                backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 65%)`,
                animation: `cdtStatIn 0.55s ease backwards`,
                animationDelay: `${0.25 + index * 0.05}s`,
                transition: 'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  borderColor: alpha(theme.palette.primary.main, 0.28),
                  boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.26 : 0.08)}`,
                },
              })}
            >
              <Typography
                component="div"
                fontWeight={800}
                sx={(theme: Theme) => ({
                  mb: 0.35,
                  fontSize: { xs: '1.85rem', sm: '2rem' },
                  lineHeight: 1.05,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                  background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                })}
              >
                {item.value}
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.65, fontSize: '0.8125rem', lineHeight: 1.25 }}>
                {item.label}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                component="p"
                sx={{
                  m: 0,
                  fontSize: '0.6875rem',
                  lineHeight: 1.5,
                  textAlign: 'justify',
                  hyphens: 'auto',
                }}
              >
                {item.detail}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <AppSurface
        surface="subtle"
        sx={{
          p: { xs: 2.5, md: 3 },
          textAlign: 'center',
          borderStyle: 'dashed',
        }}
      >
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
          Ainda opera sem uma central unificada?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', lineHeight: 1.65 }}>
          Se o seu departamento ainda depende de ferramentas dispersas, vale alinhar com a equipe interna de tecnologia:
          um workspace na Central de Tarefas integra execucao, indicadores e governanca no padrao Flexibase — sem custo
          adicional de produto, como sistema corporativo dedicado.
        </Typography>
      </AppSurface>
    </Stack>
  )
}
