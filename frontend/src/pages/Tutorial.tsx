import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  LinearProgress,
  useTheme,
  Avatar,
} from '@/compat/mui/material'
import { TierBadge } from '@/components/gamification/TierBadge'
import { TIERS } from '@/utils/tier'
import type { TierInfo } from '@/types'

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  return (
    <Box
      component="section"
      sx={{ mb: 6 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: isLight ? 'rgba(37,99,235,0.1)' : 'rgba(96,165,250,0.15)',
            border: `1px solid ${isLight ? 'rgba(37,99,235,0.2)' : 'rgba(96,165,250,0.25)'}`,
          }}
        >
          <Typography variant="caption" fontWeight={700} sx={{ color: 'primary.main', fontSize: 12 }}>
            {number}
          </Typography>
        </Box>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  )
}

// ── XP action table row ────────────────────────────────────────────────────────
function XpRow({
  action,
  base,
  bonus,
}: {
  action: string
  base: string
  bonus: string
}) {
  const theme = useTheme()
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        alignItems: 'center',
        gap: 2,
        px: 1.5,
        py: 1.25,
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography variant="body2" sx={{ fontSize: 13 }}>
        {action}
      </Typography>
      <Box
        sx={{
          px: 1,
          py: 0.375,
          borderRadius: 1,
          bgcolor: 'rgba(37,99,235,0.08)',
          border: '1px solid rgba(37,99,235,0.15)',
          textAlign: 'center',
          minWidth: 90,
        }}
      >
        <Typography variant="caption" fontWeight={700} sx={{ color: 'primary.main', fontSize: 11 }}>
          {base}
        </Typography>
      </Box>
      <Box
        sx={{
          px: 1,
          py: 0.375,
          borderRadius: 1,
          bgcolor: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.15)',
          textAlign: 'center',
          minWidth: 120,
        }}
      >
        <Typography variant="caption" fontWeight={700} sx={{ color: '#7C3AED', fontSize: 11 }}>
          {bonus}
        </Typography>
      </Box>
    </Box>
  )
}

// ── Rarity pill ────────────────────────────────────────────────────────────────
function RarityPill({
  rarity,
  color,
  border,
}: {
  rarity: string
  color: string
  border: string
}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.375,
        borderRadius: 999,
        border: `1px solid ${border}`,
        bgcolor: `${color}14`,
        mx: 0.5,
      }}
    >
      <Typography variant="caption" fontWeight={700} sx={{ color, fontSize: 10, letterSpacing: 0.4 }}>
        {rarity}
      </Typography>
    </Box>
  )
}

// ── Mock comment ───────────────────────────────────────────────────────────────
function MockComment({
  name,
  initial,
  level,
  time,
  message,
}: {
  name: string
  initial: string
  level: number
  time: string
  message: string
}) {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        py: 1.5,
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Avatar
        sx={{
          width: 34,
          height: 34,
          fontSize: 14,
          fontWeight: 700,
          bgcolor: isLight ? 'rgba(37,99,235,0.12)' : 'rgba(96,165,250,0.15)',
          color: 'primary.main',
          flexShrink: 0,
        }}
      >
        {initial}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.375 }}>
          <Typography variant="caption" fontWeight={700} sx={{ fontSize: 13 }}>
            {name}
          </Typography>
          <TierBadge level={level} size="xs" showTierName />
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
            {time}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, lineHeight: 1.5 }}>
          "{message}"
        </Typography>
      </Box>
    </Box>
  )
}

// ── Sample achievement card (static) ─────────────────────────────────────────
function SampleAchievementCard({
  icon,
  name,
  rarity,
  color,
  border,
  bg,
  unlocked,
}: {
  icon: string
  name: string
  rarity: string
  color: string
  border: string
  bg: string
  unlocked: boolean
}) {
  const theme = useTheme()
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: `1px solid ${unlocked ? border : theme.palette.divider}`,
        borderLeft: unlocked ? `3px solid ${color}` : '3px solid transparent',
        bgcolor: unlocked ? bg : 'background.paper',
        opacity: unlocked ? 1 : 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: unlocked ? `${color}18` : 'rgba(148,163,184,0.1)',
          color: unlocked ? color : 'text.disabled',
          filter: unlocked ? 'none' : 'grayscale(1)',
          flexShrink: 0,
          fontSize: 20,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" fontWeight={700} sx={{ display: 'block', fontSize: 12 }}>
          {name}
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            px: 0.625,
            py: 0.125,
            borderRadius: 999,
            border: `1px solid ${border}`,
            bgcolor: `${color}14`,
            mt: 0.25,
          }}
        >
          <Typography variant="caption" sx={{ color, fontSize: 9, fontWeight: 700 }}>
            {rarity}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

// ── Main Tutorial page ─────────────────────────────────────────────────────────
export default function Tutorial() {
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        {/* ── Page header ── */}
        <Box sx={{ mb: 5 }}>
          <Typography variant="h3" fontWeight={800} sx={{ mb: 1 }}>
            Como Funciona?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
            O CDT possui um sistema de gamificação que recompensa produtividade real. Quanto mais você
            entrega, mais XP acumula — subindo de nível e desbloqueando conquistas exclusivas.
          </Typography>
        </Box>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 1 — Visão Geral
        ════════════════════════════════════════════════════════════════════════ */}
        <Section number={1} title="Visão Geral">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {[
              { icon: '⚡', title: 'Ganhe XP', desc: 'Cada tarefa concluída vale XP. Prazos e streaks dão bônus.' },
              { icon: '🎖️', title: 'Suba de Nível', desc: 'Acumule XP e avance pelos 20 níveis do sistema.' },
              { icon: '🏆', title: 'Desbloqueie Conquistas', desc: 'Marcos especiais com XP bônus e raridade exclusiva.' },
            ].map((item) => (
              <Box
                key={item.title}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: isLight ? 'background.default' : 'rgba(255,255,255,0.03)',
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: 32, mb: 1 }}>{item.icon}</Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                  {item.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  {item.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </Section>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 2 — Como Ganhar XP
        ════════════════════════════════════════════════════════════════════════ */}
        <Section number={2} title="Como Ganhar XP">
          <Card variant="outlined" sx={{ overflow: 'hidden' }}>
            {/* Header row */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 2,
                px: 1.5,
                py: 1,
                bgcolor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: 11, letterSpacing: 0.5 }}>
                AÇÃO
              </Typography>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: 11, letterSpacing: 0.5, minWidth: 90, textAlign: 'center' }}>
                XP BASE
              </Typography>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: 11, letterSpacing: 0.5, minWidth: 120, textAlign: 'center' }}>
                BÔNUS
              </Typography>
            </Box>
            <XpRow
              action="Concluir To-do"
              base="Configurável (padrão: 10 XP)"
              bonus="+20% por prazo cumprido"
            />
            <XpRow
              action="Concluir Atividade"
              base="Configurável (padrão: 50 XP)"
              bonus="+20% por prazo cumprido"
            />
            <XpRow
              action="Desbloquear Conquista"
              base="0 XP base"
              bonus="+XP bônus da conquista"
            />
            <XpRow
              action="Streak diário ativo"
              base="—"
              bonus="+5% de bônus em tudo"
            />
          </Card>

          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: isLight ? 'rgba(37,99,235,0.04)' : 'rgba(96,165,250,0.06)',
              border: `1px solid ${isLight ? 'rgba(37,99,235,0.12)' : 'rgba(96,165,250,0.15)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: 16 }}>💡</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              O XP de cada to-do e atividade é <strong>configurável pelo criador</strong>. Tarefas mais
              complexas podem valer mais XP. Administradores podem definir conquistas vinculadas.
            </Typography>
          </Box>
        </Section>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 3 — Tiers
        ════════════════════════════════════════════════════════════════════════ */}
        <Section number={3} title="Tiers">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
            Ao atingir certos níveis você entra em um novo tier, com efeitos visuais exclusivos no seu badge.
            Cada tier tem uma identidade distinta — de Cobalt (começo sólido) até FlexiBase (elite).
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            {TIERS.map((tier: TierInfo, idx: number) => {
              const demoLevel = [3, 7, 12, 17][idx]
              const descriptions = [
                'O ponto de partida. Construa hábitos, entregue consistentemente.',
                'Você mostrou comprometimento. Energético e determinado.',
                'Veterano da equipe. Trabalho de qualidade comprovada.',
                'Elite. Nível máximo de contribuição e impacto.',
              ]
              return (
                <Card
                  key={tier.name}
                  variant="outlined"
                  sx={{
                    border: `1px solid ${tier.color}40`,
                    bgcolor: `${tier.color}06`,
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: tier.color,
                          boxShadow: `0 0 8px ${tier.glowColor}`,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="subtitle1" fontWeight={800} sx={{ color: tier.color }}>
                        {tier.name}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        L{tier.min}–L{tier.max}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, lineHeight: 1.5 }}>
                      {descriptions[idx]}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                        Badge ao vivo:
                      </Typography>
                      <TierBadge level={demoLevel} size="md" showTierName />
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        </Section>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 4 — Sistema de Conquistas
        ════════════════════════════════════════════════════════════════════════ */}
        <Section number={4} title="Sistema de Conquistas">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
            Conquistas são marcos permanentes. Uma vez desbloqueadas ficam para sempre no seu perfil.
            Cada conquista tem uma raridade que indica sua dificuldade.
          </Typography>

          {/* Rarity pills explainer */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
              Raridades:
            </Typography>
            <RarityPill rarity="Comum"    color="#94A3B8" border="rgba(148,163,184,0.3)" />
            <RarityPill rarity="Rara"     color="#2563EB" border="rgba(37,99,235,0.4)"   />
            <RarityPill rarity="Épica"    color="#7C3AED" border="rgba(124,58,237,0.45)" />
            <RarityPill rarity="Lendária" color="#F59E0B" border="rgba(245,158,11,0.5)"  />
          </Box>

          {/* Sample achievement grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <SampleAchievementCard icon="✅" name="Primeira Entrega"   rarity="Comum"    color="#94A3B8" border="rgba(148,163,184,0.3)" bg="rgba(148,163,184,0.06)" unlocked={true}  />
            <SampleAchievementCard icon="🚀" name="Sprint Completo"    rarity="Rara"     color="#2563EB" border="rgba(37,99,235,0.4)"   bg="rgba(37,99,235,0.05)"  unlocked={true}  />
            <SampleAchievementCard icon="💎" name="100 To-dos"         rarity="Épica"    color="#7C3AED" border="rgba(124,58,237,0.45)" bg="rgba(124,58,237,0.05)" unlocked={false} />
            <SampleAchievementCard icon="🔥" name="30 Dias de Streak"  rarity="Épica"    color="#7C3AED" border="rgba(124,58,237,0.45)" bg="rgba(124,58,237,0.05)" unlocked={false} />
            <SampleAchievementCard icon="🏆" name="Mestre da Equipe"   rarity="Lendária" color="#F59E0B" border="rgba(245,158,11,0.5)"  bg="rgba(245,158,11,0.06)" unlocked={false} />
            <SampleAchievementCard icon="⭐" name="Nível 20"           rarity="Lendária" color="#F59E0B" border="rgba(245,158,11,0.5)"  bg="rgba(245,158,11,0.06)" unlocked={false} />
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              border: '1px solid rgba(245,158,11,0.2)',
              bgcolor: 'rgba(245,158,11,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Typography sx={{ fontSize: 20 }}>🏆</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#F59E0B' }}>
              Conquistas são cumulativas — colecione todas!
            </Typography>
          </Box>
        </Section>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 5 — Badges nos Comentários
        ════════════════════════════════════════════════════════════════════════ */}
        <Section number={5} title="Badges nos Comentários">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            O seu tier e nível aparecem ao lado do seu nome em comentários de projetos e atividades.
            Assim toda a equipe vê a contribuição de cada um em tempo real.
          </Typography>

          <Card variant="outlined">
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <MockComment
                name="João Silva"
                initial="J"
                level={3}
                time="2 min atrás"
                message="Finalizei a feature de login! PR está aberto para revisão."
              />
              <MockComment
                name="Ana Costa"
                initial="A"
                level={8}
                time="5 min atrás"
                message="Ótimo trabalho! Já mergei o PR. Build passou em CI."
              />
              <MockComment
                name="Pedro Souza"
                initial="P"
                level={13}
                time="1h atrás"
                message="Precisamos revisar os testes de regressão antes do deploy."
              />
            </CardContent>
          </Card>
        </Section>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 6 — To-dos Desafio
        ════════════════════════════════════════════════════════════════════════ */}
        <Section number={6} title="To-dos Desafio">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
            Ao criar um to-do, você pode configurar o XP que ele vale e definir um prazo. Completar antes
            do prazo garante o bônus de 20%. Administradores podem vincular uma conquista ao to-do —
            ela é desbloqueada automaticamente quando o to-do é concluído.
          </Typography>

          {/* Mockup of creation panel */}
          <Card
            variant="outlined"
            sx={{
              border: `1px solid ${isLight ? 'rgba(37,99,235,0.2)' : 'rgba(96,165,250,0.25)'}`,
              bgcolor: isLight ? 'rgba(37,99,235,0.02)' : 'rgba(96,165,250,0.04)',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: 10, letterSpacing: 0.6, display: 'block', mb: 1.5 }}>
                CONFIGURAÇÕES DO TO-DO
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.25,
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box>
                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.25 }}>
                      Recompensa XP
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      XP dado ao completar este to-do
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      border: '1px solid rgba(124,58,237,0.25)',
                      bgcolor: 'rgba(124,58,237,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#7C3AED' }}>
                      10 XP
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.25,
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box>
                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.25 }}>
                      Prazo
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Entrega antes do prazo dá +20% XP
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      border: '1px solid rgba(5,150,105,0.25)',
                      bgcolor: 'rgba(5,150,105,0.08)',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#059669', fontSize: 12 }}>
                      Opcional
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.25,
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: 'background.paper',
                    opacity: 0.7,
                  }}
                >
                  <Box>
                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.25 }}>
                      Conquista vinculada
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Desbloqueada ao concluir (somente admin)
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      border: '1px solid rgba(245,158,11,0.3)',
                      bgcolor: 'rgba(245,158,11,0.08)',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#F59E0B', fontSize: 12 }}>
                      Admin
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Section>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 7 — XP para o Próximo Tier
        ════════════════════════════════════════════════════════════════════════ */}
        <Section number={7} title="Progressão Visual de Tiers">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
            A barra de XP do seu perfil mostra o progresso dentro do nível atual. Na página{' '}
            <Box component="span" sx={{ color: 'primary.main', fontWeight: 500 }}>
              Progressão de Nível
            </Box>{' '}
            você vê exatamente quantos XP faltam para o próximo tier.
          </Typography>

          {/* Demo progress bars for each tier */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TIERS.map((tier: TierInfo, idx: number) => {
              const fills = [0.62, 0.35, 0.8, 0.15]
              const fill = fills[idx]
              const levelRange = `L${tier.min}–L${tier.max}`
              return (
                <Box key={tier.name}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: tier.color,
                          boxShadow: `0 0 5px ${tier.glowColor}`,
                        }}
                      />
                      <Typography variant="caption" fontWeight={700} sx={{ color: tier.color, fontSize: 12 }}>
                        {tier.name}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                        {levelRange}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: tier.color, fontWeight: 600, fontSize: 11 }}>
                      {Math.round(fill * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={fill * 100}
                    sx={{
                      height: 8,
                      borderRadius: 999,
                      bgcolor: isLight ? '#E2E8F0' : '#334155',
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(90deg, ${tier.color}bb, ${tier.color})`,
                        borderRadius: 999,
                        boxShadow: `0 0 6px ${tier.glowColor}`,
                      },
                    }}
                  />
                </Box>
              )
            })}
          </Box>
        </Section>

        {/* ── Bottom CTA ── */}
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ textAlign: 'center', pb: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Dúvidas ou sugestões? Fale com o administrador do sistema.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
