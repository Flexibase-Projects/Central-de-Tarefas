import { Avatar, ButtonBase, Typography } from '@/compat/mui/material'
import { appShellHeaderControlSx } from '@/components/layout/layout-shell'
import { DeliveryHeatAvatarWrap } from '@/components/gamification/DeliveryHeatAvatarWrap'

interface HeaderProfileButtonProps {
  userId: string
  name: string
  avatarUrl?: string | null
  onClick: () => void
}

export function HeaderProfileButton({ userId, name, avatarUrl, onClick }: HeaderProfileButtonProps) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label="Meu perfil, nível e indicadores"
      sx={{
        ...appShellHeaderControlSx,
        px: 1,
        py: 0,
        maxWidth: 240,
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
      }}
    >
      <DeliveryHeatAvatarWrap userId={userId} size="sm">
        <Avatar src={avatarUrl ?? undefined} sx={{ width: 28, height: 28, fontSize: 12, fontWeight: 700 }}>
          {name?.[0]?.toUpperCase() ?? '?'}
        </Avatar>
      </DeliveryHeatAvatarWrap>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          maxWidth: 170,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </Typography>
    </ButtonBase>
  )
}
