import React, { useState } from 'react'
import {
  Popover,
  IconButton,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@/compat/mui/material'
import {
  EmojiEvents,
  CheckCircle,
  TaskAlt,
  Stars,
  Flag,
  MilitaryTech,
  AutoAwesome,
} from '@/components/ui/icons'
import type { UserProgressAchievement } from '@/types'

const ICON_MAP: Record<string, React.ElementType> = {
  check_circle: CheckCircle,
  task_alt: TaskAlt,
  stars: Stars,
  flag: Flag,
  military_tech: MilitaryTech,
  emoji_events: EmojiEvents,
  auto_awesome: AutoAwesome,
}

const RARITY_COLORS: Record<string, string> = {
  common: '#94A3B8',
  rare: '#2563EB',
  epic: '#7C3AED',
  legendary: '#F59E0B',
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
}

interface AchievementsPopoverProps {
  achievements: UserProgressAchievement[]
  loading?: boolean
  anchor?: 'sidebar' | 'header'
  children?: React.ReactNode
}

export function AchievementsPopover({
  achievements,
  loading,
  anchor = 'sidebar',
  children,
}: AchievementsPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const theme = useTheme()
  const isLight = theme.palette.mode === 'light'

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => setAnchorEl(null)

  // Sort: unlocked first, then rarity order
  const rarityOrder = ['legendary', 'epic', 'rare', 'common']
  const sorted = [...achievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
    const ra = rarityOrder.indexOf(a.rarity ?? 'common')
    const rb = rarityOrder.indexOf(b.rarity ?? 'common')
    return ra - rb
  })

  return (
    <>
      {children ? (
        <Box onClick={handleClick} sx={{ cursor: 'pointer' }}>
          {children}
        </Box>
      ) : (
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{
            borderRadius: 1,
            py: 1,
            width: '100%',
            justifyContent: 'flex-start',
            color: open ? '#F59E0B' : 'text.secondary',
            '&:hover': { color: '#F59E0B' },
            position: 'relative',
          }}
        >
          <EmojiEvents size={16} />
          {unlockedCount > 0 && (
            <Box
              component="span"
              sx={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: '#F59E0B',
                color: '#0F172A',
                fontSize: 9,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {unlockedCount}
            </Box>
          )}
        </IconButton>
      )}

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: anchor === 'sidebar' ? 'top' : 'bottom',
          horizontal: anchor === 'sidebar' ? 'right' : 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 300,
              maxWidth: 340,
              maxHeight: 400,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: isLight
                ? '0 10px 25px rgba(15,23,42,0.1), 0 4px 8px rgba(15,23,42,0.06)'
                : '0 10px 25px rgba(0,0,0,0.3)',
              bgcolor: 'background.paper',
              '&::before': { display: 'none' },
              '&::after': { display: 'none' },
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.25 }}>
            Conquistas
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {unlockedCount} de {achievements.length} desbloqueadas
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Carregando...</Typography>
          </Box>
        ) : sorted.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.disabled" textAlign="center">
              Nenhuma conquista disponível.
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ py: 0, maxHeight: 312, overflow: 'auto' }}>
            {sorted.map((a) => {
              const IconComponent = ICON_MAP[a.icon] ?? EmojiEvents
              const rarityColor = RARITY_COLORS[a.rarity ?? 'common'] ?? RARITY_COLORS.common
              const rarityLabel = a.rarity && a.rarity !== 'common'
                ? RARITY_LABELS[a.rarity]
                : null

              return (
                <ListItem
                  key={a.id}
                  sx={{
                    opacity: a.unlocked ? 1 : 0.42,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    '&:last-child': { borderBottom: 'none' },
                    py: 1,
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 34,
                      mt: 0.25,
                      color: a.unlocked ? rarityColor : 'text.disabled',
                    }}
                  >
                    <IconComponent size={18} />
                  </ListItemIcon>
                  <ListItemText
                    disableTypography
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                          {a.name}
                        </Typography>
                        {rarityLabel && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: rarityColor,
                              textTransform: 'uppercase',
                              letterSpacing: 0.4,
                              lineHeight: 1,
                            }}
                          >
                            {rarityLabel}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: 'text.secondary', fontSize: 11, lineHeight: 1.4 }}
                        >
                          {a.description}
                        </Typography>
                        {a.xpBonus != null && a.xpBonus > 0 && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 10, mt: 0.25, display: 'block' }}
                          >
                            +{a.xpBonus} XP
                          </Typography>
                        )}
                        {a.unlocked && a.unlockedAt && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.disabled', fontSize: 10, mt: 0.125, display: 'block' }}
                          >
                            {new Date(a.unlockedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              )
            })}
          </List>
        )}
      </Popover>
    </>
  )
}
