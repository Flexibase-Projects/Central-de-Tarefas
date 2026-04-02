declare module '@/compat/mui/material' {
  import * as React from 'react'
  import type { SxProps, Theme } from '@/compat/mui/styles'

  type CompatHtmlProps<E extends HTMLElement = HTMLElement> = Omit<React.HTMLAttributes<E>, 'color'> & {
    [key: string]: any
    sx?: SxProps<Theme>
    component?: React.ElementType
    children?: React.ReactNode
    style?: React.CSSProperties
  }

  type CompatButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'size'> & {
    [key: string]: any
    sx?: SxProps<Theme>
    children?: React.ReactNode
    style?: React.CSSProperties
  }

  type CompatInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'color' | 'size' | 'onChange'> & {
    [key: string]: any
    sx?: SxProps<Theme>
    children?: React.ReactNode
    style?: React.CSSProperties
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  }

  type CompatSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'color' | 'size' | 'onChange'> & {
    [key: string]: any
    sx?: SxProps<Theme>
    children?: React.ReactNode
    style?: React.CSSProperties
    onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void
  }

  export type BoxProps = CompatHtmlProps
  export type PaperProps = CompatHtmlProps
  export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>
  export { ThemeProvider, CssBaseline, useTheme } from '@/compat/mui/styles'
  export type { PaletteMode, SxProps, Theme } from '@/compat/mui/styles'

  export const Box: React.ComponentType<CompatHtmlProps>
  export const Paper: React.ComponentType<CompatHtmlProps>
  export const Card: React.ComponentType<CompatHtmlProps>
  export const CardContent: React.ComponentType<CompatHtmlProps>
  export const CardActionArea: React.ComponentType<CompatButtonProps>
  export const Typography: React.ComponentType<CompatHtmlProps>
  export const Stack: React.ComponentType<CompatHtmlProps>
  export const Divider: React.ComponentType<CompatHtmlProps>
  export const Avatar: React.ComponentType<CompatHtmlProps>
  export const Button: React.ComponentType<CompatButtonProps>
  export const IconButton: React.ComponentType<CompatButtonProps>
  export const ButtonBase: React.ComponentType<CompatButtonProps>
  export const Fab: React.ComponentType<CompatButtonProps>
  export const Alert: React.ComponentType<CompatHtmlProps>
  export const Chip: React.ComponentType<CompatHtmlProps>
  export const CircularProgress: React.ComponentType<{ [key: string]: any; size?: number | string; color?: string; className?: string; style?: React.CSSProperties }>
  export const LinearProgress: React.ComponentType<{ [key: string]: any; value?: number; variant?: string; color?: string; className?: string; style?: React.CSSProperties }>
  export const Skeleton: React.ComponentType<CompatHtmlProps>
  export const Tooltip: React.ComponentType<{ [key: string]: any; title?: React.ReactNode; children?: React.ReactNode; disableHoverListener?: boolean }>
  export const Tabs: React.ComponentType<{ [key: string]: any; sx?: SxProps<Theme>; children?: React.ReactNode; value?: any; onChange?: (event: React.SyntheticEvent, value: any) => void }>
  export const Tab: React.ComponentType<CompatButtonProps & { value?: any; label?: React.ReactNode; icon?: React.ReactNode }>
  export const TableContainer: React.ComponentType<CompatHtmlProps>
  export const Table: React.ComponentType<CompatHtmlProps>
  export const TableHead: React.ComponentType<CompatHtmlProps>
  export const TableBody: React.ComponentType<CompatHtmlProps>
  export const TableRow: React.ComponentType<CompatHtmlProps>
  export const TableCell: React.ComponentType<CompatHtmlProps & { align?: 'left' | 'center' | 'right' | 'justify' | 'inherit' }>
  export const TablePagination: React.ComponentType<{ [key: string]: any; onPageChange?: (event: unknown, page: number) => void }>
  export const Dialog: React.ComponentType<{ [key: string]: any; open?: boolean; onClose?: (...args: any[]) => void; children?: React.ReactNode }>
  export const DialogTitle: React.ComponentType<CompatHtmlProps>
  export const DialogContent: React.ComponentType<CompatHtmlProps>
  export const DialogActions: React.ComponentType<CompatHtmlProps>
  export const Menu: React.ComponentType<{ [key: string]: any; open?: boolean; onClose?: (...args: any[]) => void; children?: React.ReactNode }>
  export const Popover: React.ComponentType<{ [key: string]: any; open?: boolean; onClose?: (...args: any[]) => void; children?: React.ReactNode }>
  export const Popper: React.ComponentType<{ [key: string]: any; open?: boolean; children?: React.ReactNode }>
  export const FormControl: React.ComponentType<CompatHtmlProps>
  export const InputLabel: React.ComponentType<CompatHtmlProps>
  export const Select: React.ComponentType<CompatSelectProps & { size?: any }>
  export const MenuItem: React.ComponentType<CompatHtmlProps>
  export const TextField: React.ComponentType<CompatInputProps & { size?: any; inputProps?: React.InputHTMLAttributes<HTMLInputElement>; InputProps?: Record<string, any> }>
  export const Checkbox: React.ComponentType<Omit<CompatInputProps, 'onChange'> & { checked?: boolean; size?: any; onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void }>
  export const Switch: React.ComponentType<Omit<CompatInputProps, 'onChange'> & { checked?: boolean; size?: any; onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void }>
  export const FormControlLabel: React.ComponentType<CompatHtmlProps & { control?: React.ReactNode; label?: React.ReactNode }>
  export const ClickAwayListener: React.ComponentType<{ children?: React.ReactNode; onClickAway?: (event: MouseEvent | TouchEvent) => void }>
  export const InputAdornment: React.ComponentType<CompatHtmlProps>
  export const List: React.ComponentType<CompatHtmlProps>
  export const ListItem: React.ComponentType<CompatHtmlProps>
  export const ListItemIcon: React.ComponentType<CompatHtmlProps>
  export const ListItemText: React.ComponentType<CompatHtmlProps & { primary?: React.ReactNode; secondary?: React.ReactNode }>
  export const ListItemButton: React.ComponentType<CompatButtonProps>
  export const ListItemAvatar: React.ComponentType<CompatHtmlProps>
  export const Badge: React.ComponentType<{ [key: string]: any; badgeContent?: React.ReactNode; children?: React.ReactNode }>
  export const Snackbar: React.ComponentType<{ [key: string]: any; open?: boolean; onClose?: (...args: any[]) => void; children?: React.ReactNode }>
  export const Collapse: React.ComponentType<{ [key: string]: any; in?: boolean; children?: React.ReactNode }>
  export const Drawer: React.ComponentType<{ [key: string]: any; open?: boolean; onClose?: (...args: any[]) => void; children?: React.ReactNode }>
  export const Autocomplete: React.ComponentType<{ [key: string]: any; onChange?: (event: React.SyntheticEvent, value: any) => void; getOptionLabel?: (option: any) => string; isOptionEqualToValue?: (left: any, right: any) => boolean; renderInput?: (params: Record<string, any>) => React.ReactNode; renderOption?: (props: any, option: any) => React.ReactNode }>
}

declare module '@/compat/mui/styles' {
  export type { PaletteMode, Theme, SxProps } from '@/compat/mui/styles'
  export const alpha: (value: string, opacity: number) => string
  export const createTheme: (input: Record<string, any>) => import('@/compat/mui/styles').Theme
  export const useTheme: () => import('@/compat/mui/styles').Theme
}

declare module '@/compat/mui/icons-material' {
  import * as React from 'react'

  type IconProps = React.SVGProps<SVGSVGElement> & {
    [key: string]: any
    fontSize?: 'small' | 'medium' | 'large'
  }

  export const ToggleOn: React.ComponentType<IconProps>
  export const ToggleOff: React.ComponentType<IconProps>
  export const Visibility: React.ComponentType<IconProps>
  export const VisibilityOff: React.ComponentType<IconProps>
  export const Search: React.ComponentType<IconProps>
  export const Close: React.ComponentType<IconProps>
}
