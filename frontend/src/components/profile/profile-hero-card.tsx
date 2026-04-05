import { Avatar, Box, Card, CardContent, Chip, IconButton, Stack, Typography } from '@/compat/mui/material'
import { DeliveryHeatAvatarWrap } from '@/components/gamification/DeliveryHeatAvatarWrap'
import { Pencil } from '@/components/ui/icons'
import type { WorkspaceMembershipContext } from '@/types'
import { formatProfileInitials } from './profile-utils'

export interface ProfileHeroCardProps {
  heroName: string
  heroAvatar: string | null | undefined
  /** Quando definido, aplica anel de delivery heat (gamificação) ao avatar */
  heatUserId?: string | null
  email: string | null | undefined
  workspaceName: string
  membership: WorkspaceMembershipContext | null | undefined
  isManagerial: boolean
  onEditClick: () => void
}

export function ProfileHeroCard({
  heroName,
  heroAvatar,
  heatUserId,
  email,
  workspaceName,
  membership,
  isManagerial,
  onEditClick,
}: ProfileHeroCardProps) {
  return (
    <Card variant="outlined" sx={{ mb: 2.5 }}>
      <CardContent
        sx={{
          position: 'relative',
          p: 3,
          pr: 7,
          '&:last-child': { pb: 3 },
        }}
      >
        <IconButton
          aria-label="Editar perfil"
          onClick={onEditClick}
          sx={{
            position: 'absolute',
            // Na compat MUI, números em top/right viram theme.spacing(n), não px — usar string explícita
            top: '10px',
            right: '10px',
            zIndex: 1,
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' },
          }}
          size="small"
        >
          <Pencil size={18} />
        </IconButton>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ md: 'flex-start' }}>
          <DeliveryHeatAvatarWrap userId={heatUserId} size="md">
            <Avatar
              src={heroAvatar ?? undefined}
              sx={{
                width: 92,
                height: 92,
                fontSize: 34,
                fontWeight: 800,
                bgcolor: 'action.hover',
                flexShrink: 0,
              }}
            >
              {formatProfileInitials(heroName)}
            </Avatar>
          </DeliveryHeatAvatarWrap>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 0.75, lineHeight: 1.2 }}>
              {heroName}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
              {membership?.role_display_name ? (
                <Chip label={membership.role_display_name} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
              ) : null}
              {isManagerial ? (
                <Chip label="Perfil gerencial" size="small" color="primary" sx={{ height: 22, fontSize: '0.7rem' }} />
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
              {email ?? ''}
            </Typography>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              alignSelf: { xs: 'stretch', md: 'center' },
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              minWidth: { md: 160 },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
              Workspace
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {workspaceName}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
