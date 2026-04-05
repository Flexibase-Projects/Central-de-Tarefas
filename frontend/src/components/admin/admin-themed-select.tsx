import { useId, useState } from 'react'
import { Box, Menu, MenuItem, Typography } from '@/compat/mui/material'
import { ChevronDown } from 'lucide-react'

export type AdminThemedSelectOption = { value: string; label: string }

type AdminThemedSelectProps = {
  value: string
  onChange: (value: string) => void
  options: AdminThemedSelectOption[]
  /** Rótulo opcional (ex.: diálogo); na tabela use só o cabeçalho da coluna. */
  label?: string
  ariaLabel?: string
  /** Quando `value` não está em `options` (ex.: role_id vazio no API mas nome conhecido), exibe este texto. */
  fallbackLabel?: string
  disabled?: boolean
  dense?: boolean
  minWidth?: number
  fullWidth?: boolean
}

/**
 * Select que abre lista em {@link Menu} (tema escuro/claro), em vez de &lt;select&gt; nativo
 * (lista costuma ficar clara e fora do tema).
 */
export function AdminThemedSelect({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  fallbackLabel,
  disabled,
  dense,
  minWidth = 140,
  fullWidth,
}: AdminThemedSelectProps) {
  const triggerId = useId()
  const labelId = `${triggerId}-label`
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const selected = options.find((o) => o.value === value)
  const trimmedFallback = typeof fallbackLabel === 'string' ? fallbackLabel.trim() : ''
  const selectedLabel = typeof selected?.label === 'string' ? selected.label.trim() : ''
  const displayLabel = selectedLabel || trimmedFallback || '—'

  const minH = dense ? 30 : 40
  const fontSize = dense ? '0.8125rem' : undefined
  const py = dense ? 0.25 : 1
  const chevronSize = dense ? 14 : 16
  const px = dense ? 0.625 : 1

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: label ? 0.5 : 0,
        width: fullWidth ? '100%' : undefined,
        minWidth: fullWidth ? undefined : minWidth,
      }}
    >
      {label ? (
        <Typography
          id={labelId}
          component="label"
          htmlFor={triggerId}
          sx={{
            fontSize: 13,
            fontWeight: 600,
            color: 'text.secondary',
          }}
        >
          {label}
        </Typography>
      ) : null}

      <Box
        component="button"
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={label ? labelId : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(event) => {
          if (disabled) return
          setAnchorEl(event.currentTarget)
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: dense ? 0.25 : 0.5,
          width: '100%',
          minWidth,
          minHeight: minH,
          px,
          py,
          borderRadius: 'var(--radius-md)',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          fontSize,
          lineHeight: dense ? 1.25 : undefined,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          textAlign: 'left',
          fontFamily: 'inherit',
          '&:focus-visible': {
            outline: 'none',
            borderColor: 'primary.main',
            boxShadow: '0 0 0 3px rgba(62, 99, 184, 0.12)',
          },
        }}
      >
        <Box
          component="span"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}
        >
          {displayLabel}
        </Box>
        <ChevronDown size={chevronSize} style={{ flexShrink: 0, opacity: 0.72 }} aria-hidden />
      </Box>

      <Menu
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            minWidth: anchorEl ? anchorEl.offsetWidth : minWidth,
            maxHeight: 320,
            overflow: 'auto',
            mt: 0.5,
          },
        }}
      >
        {options.map((opt) => (
          <MenuItem
            key={opt.value}
            onClick={() => {
              onChange(opt.value)
              setAnchorEl(null)
            }}
            sx={{
              fontSize: dense ? '0.8125rem' : undefined,
              py: dense ? 0.75 : 1,
              fontWeight: opt.value === value ? 600 : 400,
              color: 'text.primary',
              bgcolor: opt.value === value ? 'action.selected' : 'transparent',
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}
