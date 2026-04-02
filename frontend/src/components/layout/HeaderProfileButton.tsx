import { Avatar, ButtonBase, Typography } from '@/compat/mui/material'

interface HeaderProfileButtonProps {
  name: string
  avatarUrl?: string | null
  onClick: () => void
}

export function HeaderProfileButton({ name, avatarUrl, onClick }: HeaderProfileButtonProps) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label="Meu perfil, nível e indicadores"
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        maxWidth: 240,
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Avatar src={avatarUrl ?? undefined} sx={{ width: 30, height: 30, fontSize: 13, fontWeight: 700 }}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </Avatar>
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
