/* eslint-disable @typescript-eslint/ban-ts-comment, react-hooks/rules-of-hooks, react-refresh/only-export-components */
// @ts-nocheck
import * as React from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip as PrimitiveTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog as PrimitiveDialog,
  DialogContent as PrimitiveDialogContent,
} from '@/components/ui/dialog'
import {
  CssBaseline,
  ThemeProvider,
  useTheme,
  type PaletteMode,
  type SxProps,
  type Theme,
} from './styles'
import { mergeSx, splitSystemProps, useSxClassName } from './sx'

export type { PaletteMode, SxProps, Theme }

export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>

type BaseProps = {
  component?: React.ElementType
  sx?: SxProps<Theme>
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export type BoxProps = React.HTMLAttributes<HTMLElement> & BaseProps
export type PaperProps = React.HTMLAttributes<HTMLElement> & BaseProps

const COLOR_TONES = {
  default: {
    background: 'var(--surface-subtle)',
    foreground: 'var(--text-primary)',
    border: 'var(--border-default)',
  },
  primary: {
    background: 'rgba(62, 99, 184, 0.12)',
    foreground: 'hsl(var(--primary))',
    border: 'rgba(62, 99, 184, 0.24)',
  },
  success: {
    background: 'var(--status-success-bg)',
    foreground: 'hsl(144 50% 32%)',
    border: 'rgba(34, 197, 94, 0.22)',
  },
  warning: {
    background: 'var(--status-warning-bg)',
    foreground: 'hsl(35 92% 32%)',
    border: 'rgba(245, 158, 11, 0.24)',
  },
  error: {
    background: 'var(--status-danger-bg)',
    foreground: 'hsl(var(--destructive))',
    border: 'rgba(220, 38, 38, 0.24)',
  },
  info: {
    background: 'var(--status-info-bg)',
    foreground: 'hsl(213 64% 42%)',
    border: 'rgba(37, 99, 235, 0.2)',
  },
  inherit: {
    background: 'transparent',
    foreground: 'inherit',
    border: 'var(--border-default)',
  },
}

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function ensureNode(children: React.ReactNode) {
  if (React.isValidElement(children)) return children
  return <span>{children}</span>
}

function useCompatClassName(baseSx: SxProps<Theme> | Record<string, unknown> | undefined, props: Record<string, unknown>) {
  const { system, rest } = splitSystemProps(props)
  const className = useSxClassName(mergeSx(baseSx, system, rest.sx))
  return {
    className: cn(className, rest.className),
    rest,
  }
}

function createPrimitive(defaultComponent: React.ElementType, baseSx?: SxProps<Theme> | Record<string, unknown>) {
  return React.forwardRef(function CompatPrimitive(props: BaseProps & Record<string, unknown>, ref) {
    const { component, children, style, ...restProps } = props
    const { className, rest } = useCompatClassName(baseSx, restProps)
    const Comp = component ?? defaultComponent
    return React.createElement(Comp, { ...rest, ref, className, style }, children)
  })
}

export const Box: any = createPrimitive('div')

export const Paper: any = React.forwardRef(function Paper(props: PaperProps & { elevation?: number; variant?: string }, ref) {
  const theme = useTheme()
  const { elevation = 0, variant, children, component, style, ...restProps } = props
  const { className, rest } = useCompatClassName(
    {
      backgroundColor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 'var(--radius-md)',
      boxShadow:
        elevation > 0
          ? theme.palette.mode === 'light'
            ? '0 8px 20px rgba(15, 23, 42, 0.08)'
            : '0 12px 28px rgba(0, 0, 0, 0.24)'
          : 'none',
      ...(variant === 'outlined' ? { boxShadow: 'none' } : null),
    },
    restProps,
  )
  const Comp = component ?? 'div'
  return React.createElement(Comp, { ...rest, ref, className, style }, children)
})

export const Card: any = React.forwardRef(function Card(props: PaperProps, ref) {
  return <Paper ref={ref} {...props} />
})

export const CardContent: any = React.forwardRef(function CardContent(props: BaseProps & React.HTMLAttributes<HTMLElement>, ref) {
  const { component, children, style, ...restProps } = props
  const { className, rest } = useCompatClassName(
    {
      padding: 2,
      '&:last-child': {
        paddingBottom: 3,
      },
    },
    restProps,
  )
  const Comp = component ?? 'div'
  return React.createElement(Comp, { ...rest, ref, className, style }, children)
})

export const CardActionArea: any = React.forwardRef(function CardActionArea(props: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>, ref) {
  const { children, style, ...restProps } = props
  const { className, rest } = useCompatClassName(
    {
      width: '100%',
      display: 'block',
      textAlign: 'left',
      borderRadius: 'inherit',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'action.hover',
      },
    },
    restProps,
  )
  return (
    <button {...rest} ref={ref} className={className} style={style} type={rest.type ?? 'button'}>
      {children}
    </button>
  )
})

const TYPOGRAPHY_VARIANTS = {
  h1: { component: 'h1' },
  h2: { component: 'h2' },
  h3: { component: 'h3' },
  h4: { component: 'h4' },
  h5: { component: 'h5' },
  h6: { component: 'h6' },
  subtitle1: { component: 'div' },
  subtitle2: { component: 'div' },
  body1: { component: 'p' },
  body2: { component: 'p' },
  caption: { component: 'span' },
  overline: { component: 'span' },
  button: { component: 'span' },
}

export const Typography: any = React.forwardRef(function Typography(
  props: BaseProps & {
    variant?: keyof typeof TYPOGRAPHY_VARIANTS
    color?: string
    noWrap?: boolean
  },
  ref,
) {
  const theme = useTheme()
  const { component, variant = 'body1', color, noWrap, children, style, ...restProps } = props
  const variantStyles = theme.typography[variant] ?? theme.typography.body1 ?? {}
  const { className, rest } = useCompatClassName(
    {
      margin: 0,
      color: color ?? undefined,
      ...(variantStyles as Record<string, unknown>),
      ...(noWrap
        ? {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }
        : null),
    },
    restProps,
  )
  const Comp = component ?? TYPOGRAPHY_VARIANTS[variant]?.component ?? 'p'
  return React.createElement(Comp, { ...rest, ref, className, style }, children)
})

export const Stack: any = React.forwardRef(function Stack(
  props: BaseProps & {
    direction?: unknown
    spacing?: unknown
    useFlexGap?: boolean
  },
  ref,
) {
  const { direction = 'column', spacing = 0, children, component, style, ...restProps } = props
  const { className, rest } = useCompatClassName(
    {
      display: 'flex',
      flexDirection: direction,
      gap: spacing,
    },
    restProps,
  )
  const Comp = component ?? 'div'
  return React.createElement(Comp, { ...rest, ref, className, style }, children)
})

export const Divider: any = React.forwardRef(function Divider(
  props: BaseProps & { orientation?: 'horizontal' | 'vertical' },
  ref,
) {
  const { orientation = 'horizontal', component, children, style, ...restProps } = props
  const { className, rest } = useCompatClassName(
    orientation === 'vertical'
      ? {
          width: '1px',
          alignSelf: 'stretch',
          backgroundColor: 'divider',
        }
      : {
          height: '1px',
          width: '100%',
          backgroundColor: 'divider',
        },
    restProps,
  )
  const Comp = component ?? 'div'
  return React.createElement(Comp, { ...rest, ref, className, style, 'aria-hidden': true }, children)
})

export const Avatar: any = React.forwardRef(function Avatar(
  props: BaseProps & {
    src?: string
    alt?: string
  },
  ref,
) {
  const { src, alt, children, style, ...restProps } = props
  const { className, rest } = useCompatClassName(
    {
      width: 40,
      height: 40,
      borderRadius: '999px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: 'action.hover',
      color: 'text.primary',
      fontWeight: 700,
      flexShrink: 0,
    },
    restProps,
  )

  return (
    <span {...rest} ref={ref} className={className} style={style}>
      {src ? <img src={src} alt={alt ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : children}
    </span>
  )
})

function getButtonTone(color: string | undefined) {
  if (!color) return COLOR_TONES.primary
  return COLOR_TONES[color] ?? COLOR_TONES.default
}

function renderButtonContent(startIcon: React.ReactNode, children: React.ReactNode, endIcon: React.ReactNode) {
  return (
    <>
      {startIcon ? <span className="MuiButton-startIcon inline-flex items-center">{startIcon}</span> : null}
      {children}
      {endIcon ? <span className="MuiButton-endIcon inline-flex items-center">{endIcon}</span> : null}
    </>
  )
}

export const Button: any = React.forwardRef(function Button(
  props: BaseProps &
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      color?: string
      variant?: 'text' | 'outlined' | 'contained'
      size?: 'small' | 'medium' | 'large'
      startIcon?: React.ReactNode
      endIcon?: React.ReactNode
      fullWidth?: boolean
    },
  ref,
) {
  const theme = useTheme()
  const {
    children,
    color,
    variant = 'text',
    size = 'medium',
    startIcon,
    endIcon,
    fullWidth,
    style,
    ...restProps
  } = props
  const tone = getButtonTone(color)
  const sizeSx =
    size === 'small'
      ? { minHeight: 34, paddingLeft: 1.25, paddingRight: 1.25, fontSize: 13 }
      : size === 'large'
        ? { minHeight: 44, paddingLeft: 2, paddingRight: 2, fontSize: 15 }
        : { minHeight: 38, paddingLeft: 1.5, paddingRight: 1.5, fontSize: 14 }
  const variantSx =
    variant === 'contained'
      ? {
          backgroundColor: tone.foreground,
          color: color === 'inherit' ? 'background.paper' : theme.palette.common.white,
          border: '1px solid transparent',
          '&:hover': {
            filter: 'brightness(0.96)',
          },
        }
      : variant === 'outlined'
        ? {
            backgroundColor: 'transparent',
            color: tone.foreground,
            border: '1px solid',
            borderColor: color === 'inherit' ? 'divider' : tone.border,
            '&:hover': {
              backgroundColor: tone.background,
            },
          }
        : {
            backgroundColor: 'transparent',
            color: color === 'inherit' ? 'text.primary' : tone.foreground,
            border: '1px solid transparent',
            '&:hover': {
              backgroundColor: tone.background,
            },
          }
  const { className, rest } = useCompatClassName(
    mergeSx(
      {
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        textTransform: 'none',
        transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
        cursor: 'pointer',
        '&:disabled': {
          opacity: 0.55,
          cursor: 'not-allowed',
        },
      },
      sizeSx,
      variantSx,
    ),
    restProps,
  )
  return (
    <button {...rest} ref={ref} className={className} style={style} type={rest.type ?? 'button'}>
      {renderButtonContent(startIcon, children, endIcon)}
    </button>
  )
})

export const IconButton: any = React.forwardRef(function IconButton(
  props: BaseProps &
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      color?: string
      size?: 'small' | 'medium' | 'large'
      edge?: 'start' | 'end'
    },
  ref,
) {
  const { children, size = 'medium', style, ...restProps } = props
  const sizeValue = size === 'small' ? 32 : size === 'large' ? 42 : 38
  const { className, rest } = useCompatClassName(
    {
      width: sizeValue,
      height: sizeValue,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: 'transparent',
      border: '1px solid transparent',
      color: 'text.primary',
      '&:hover': {
        backgroundColor: 'action.hover',
      },
      '&:disabled': {
        opacity: 0.55,
      },
    },
    restProps,
  )
  return (
    <button {...rest} ref={ref} className={className} style={style} type={rest.type ?? 'button'}>
      {children}
    </button>
  )
})

export const Fab: any = React.forwardRef(function Fab(
  props: BaseProps &
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      color?: string
      size?: 'small' | 'medium' | 'large'
      variant?: 'circular' | 'extended'
    },
  ref,
) {
  const { children, color = 'primary', size = 'large', variant = 'circular', style, ...restProps } = props
  const tone = getButtonTone(color)
  const dimensions =
    size === 'small'
      ? { width: 40, height: 40 }
      : size === 'medium'
        ? { width: 48, height: 48 }
        : { width: 56, height: 56 }
  const extended = variant === 'extended'
  const { className, rest } = useCompatClassName(
    {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0.75,
      minWidth: extended ? 64 : dimensions.width,
      width: extended ? 'auto' : dimensions.width,
      height: dimensions.height,
      paddingLeft: extended ? 2 : 0,
      paddingRight: extended ? 2 : 0,
      borderRadius: extended ? '999px' : '999px',
      border: '1px solid transparent',
      backgroundColor: tone.foreground,
      color: color === 'inherit' ? 'background.paper' : 'common.white',
      boxShadow: '0 18px 38px -18px rgba(15, 23, 42, 0.55)',
      transition: 'transform 160ms ease, box-shadow 160ms ease, filter 160ms ease',
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-1px)',
        filter: 'brightness(0.98)',
        boxShadow: '0 22px 42px -18px rgba(15, 23, 42, 0.58)',
      },
      '&:focus-visible': {
        outline: '2px solid hsl(var(--ring))',
        outlineOffset: 2,
      },
      '&:disabled': {
        opacity: 0.55,
        cursor: 'not-allowed',
        transform: 'none',
        boxShadow: 'none',
      },
    },
    restProps,
  )

  return (
    <button {...rest} ref={ref} className={className} style={style} type={rest.type ?? 'button'}>
      {children}
    </button>
  )
})

export const ButtonBase: any = React.forwardRef(function ButtonBase(
  props: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>,
  ref,
) {
  const { children, style, ...restProps } = props
  const { className, rest } = useCompatClassName(
    {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      background: 'transparent',
      padding: 0,
      cursor: 'pointer',
    },
    restProps,
  )
  return (
    <button {...rest} ref={ref} className={className} style={style} type={rest.type ?? 'button'}>
      {children}
    </button>
  )
})

function alertIcon(severity: string) {
  switch (severity) {
    case 'success':
      return <CheckCircle2 size={16} />
    case 'warning':
      return <AlertTriangle size={16} />
    case 'error':
      return <AlertCircle size={16} />
    default:
      return <AlertCircle size={16} />
  }
}

export const Alert: any = React.forwardRef(function Alert(
  props: BaseProps & { severity?: 'error' | 'warning' | 'info' | 'success'; onClose?: () => void },
  ref,
) {
  const { severity = 'info', onClose, children, style, ...restProps } = props
  const tone = getButtonTone(severity)
  const { className, rest } = useCompatClassName(
    {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1,
      padding: 1.25,
      borderRadius: 'var(--radius-md)',
      backgroundColor: tone.background,
      color: tone.foreground,
      border: '1px solid',
      borderColor: tone.border,
    },
    restProps,
  )
  return (
    <div {...rest} ref={ref} className={className} style={style} role="alert">
      <span className="MuiAlert-icon mt-[2px] inline-flex">{alertIcon(severity)}</span>
      <div className="MuiAlert-message flex-1">{children}</div>
      {onClose ? (
        <button
          type="button"
          aria-label="Fechar alerta"
          onClick={onClose}
          className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] border border-transparent bg-transparent text-current transition-colors hover:bg-black/5"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  )
})

export const Chip: any = React.forwardRef(function Chip(
  props: BaseProps & {
    label?: React.ReactNode
    size?: 'small' | 'medium'
    color?: string
    variant?: 'filled' | 'outlined'
    icon?: React.ReactNode
    onDelete?: () => void
    onClick?: () => void
  },
  ref,
) {
  const {
    label,
    size = 'medium',
    color = 'default',
    variant = 'filled',
    icon,
    onDelete,
    onClick,
    children,
    style,
    ...restProps
  } = props
  const tone = getButtonTone(color)
  const { className, rest } = useCompatClassName(
    {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      minHeight: size === 'small' ? 20 : 28,
      paddingLeft: size === 'small' ? 0.75 : 1,
      paddingRight: size === 'small' ? 0.75 : 1,
      borderRadius: 'var(--radius-sm)',
      border: '1px solid',
      borderColor: variant === 'outlined' ? tone.border : 'transparent',
      backgroundColor: variant === 'outlined' ? 'transparent' : tone.background,
      color: tone.foreground,
      fontSize: size === 'small' ? 11 : 12,
      fontWeight: 600,
      cursor: onClick ? 'pointer' : 'default',
    },
    restProps,
  )
  const Comp = onClick ? 'button' : 'span'
  return (
    <Comp
      {...rest}
      ref={ref}
      className={className}
      style={style}
      onClick={onClick}
      type={Comp === 'button' ? 'button' : undefined}
    >
      {icon ? <span className="MuiChip-icon inline-flex items-center">{icon}</span> : null}
      <span className="MuiChip-label">{label ?? children}</span>
      {onDelete ? (
        <button type="button" className="inline-flex h-4 w-4 items-center justify-center" onClick={onDelete}>
          <X size={12} />
        </button>
      ) : null}
    </Comp>
  )
})

export const CircularProgress: any = function CircularProgress({ size = 40, color = 'primary', className, style, ...props }) {
  const theme = useTheme()
  const stroke = color === 'inherit' ? 'currentColor' : getButtonTone(color).foreground
  return (
    <span
      {...props}
      className={cn('mui-compat-spinner inline-flex items-center justify-center', className)}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%' }}>
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke={theme.palette.mode === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)'}
          strokeWidth="3"
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="42 18"
        />
      </svg>
    </span>
  )
}

export const LinearProgress: any = function LinearProgress({
  value = 0,
  variant = 'indeterminate',
  color = 'primary',
  className,
  style,
  ...props
}) {
  const tone = getButtonTone(color)
  const determinate = variant === 'determinate'
  return (
    <span
      {...props}
      className={cn('mui-compat-linear-progress relative flex overflow-hidden rounded-full', className)}
      style={{ height: 6, width: '100%', background: 'rgba(148, 163, 184, 0.22)', ...style }}
    >
      <span
        className={cn('MuiLinearProgress-bar', determinate ? '' : 'mui-compat-linear-progress-indeterminate')}
        style={{
          width: determinate ? `${Math.max(0, Math.min(100, value))}%` : '40%',
          background: tone.foreground,
        }}
      />
    </span>
  )
}

export const Skeleton: any = function Skeleton({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className,
  style,
  ...props
}) {
  const skeletonHeight =
    height ??
    (variant === 'text'
      ? 16
      : variant === 'circular'
        ? width ?? 40
        : 40)
  const skeletonWidth = width ?? (variant === 'text' ? '100%' : undefined)
  const borderRadius =
    variant === 'circular'
      ? '999px'
      : variant === 'rounded'
        ? 'var(--radius-md)'
        : variant === 'text'
          ? '999px'
          : 'var(--radius-sm)'

  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn(animation !== false ? 'animate-pulse' : undefined, 'inline-flex bg-[var(--surface-subtle)]', className)}
      style={{
        width: skeletonWidth,
        height: skeletonHeight,
        borderRadius,
        ...style,
      }}
    />
  )
}

export const Tooltip: any = function Tooltip({ title, children, disableHoverListener, ...props }) {
  if (!title || disableHoverListener) return <>{children}</>

  return (
    <TooltipProvider delayDuration={80}>
      <PrimitiveTooltip>
        <TooltipTrigger asChild>{ensureNode(children)}</TooltipTrigger>
        <TooltipContent {...props}>{title}</TooltipContent>
      </PrimitiveTooltip>
    </TooltipProvider>
  )
}

const TabsContext = React.createContext(null)

export const Tabs: any = function Tabs({ value, onChange, children, style, ...restProps }) {
  const { className, rest } = useCompatClassName(
    {
      display: 'flex',
      alignItems: 'center',
      gap: 0.5,
      borderBottom: '1px solid',
      borderColor: 'divider',
      overflowX: 'auto',
    },
    restProps,
  )

  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div {...rest} className={className} style={style} role="tablist">
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export const Tab: any = function Tab({ label, value, icon, disabled, style, ...restProps }) {
  const context = React.useContext(TabsContext)
  const selected = context?.value === value
  const { className, rest } = useCompatClassName(
    {
      minHeight: 42,
      paddingLeft: 1.5,
      paddingRight: 1.5,
      borderBottom: '2px solid',
      borderColor: selected ? 'primary.main' : 'transparent',
      color: selected ? 'primary.main' : 'text.secondary',
      fontWeight: 600,
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: 'action.hover',
      },
      '&:disabled': {
        opacity: 0.55,
      },
    },
    restProps,
  )

  return (
    <button
      {...rest}
      className={className}
      style={style}
      type="button"
      role="tab"
      aria-selected={selected}
      disabled={disabled}
      onClick={(event) => context?.onChange?.(event, value)}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  )
}

export const TableContainer: any = createPrimitive('div', {
  overflowX: 'auto',
  width: '100%',
})

export const Table: any = createPrimitive('table', {
  width: '100%',
  borderCollapse: 'collapse',
})

export const TableHead: any = createPrimitive('thead')
export const TableBody: any = createPrimitive('tbody')

export const TableRow: any = React.forwardRef(function TableRow(props, ref) {
  const { hover, style, children, ...restProps } = props
  const { className, rest } = useCompatClassName(
    hover
      ? {
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }
      : undefined,
    restProps,
  )
  return (
    <tr {...rest} ref={ref} className={className} style={style}>
      {children}
    </tr>
  )
})

export const TableCell: any = React.forwardRef(function TableCell(props, ref) {
  const { align, component, style, children, ...restProps } = props
  const { className, rest } = useCompatClassName(
    {
      padding: 1.5,
      borderBottom: '1px solid',
      borderColor: 'divider',
      textAlign: align ?? undefined,
      verticalAlign: 'middle',
    },
    restProps,
  )
  const Comp = component ?? 'td'
  return React.createElement(Comp, { ...rest, ref, className, style }, children)
})

export const TablePagination: any = function TablePagination({
  component,
  count = 0,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50],
  labelRowsPerPage = 'Linhas por página:',
  labelDisplayedRows,
  style,
  ...restProps
}) {
  const totalPages = rowsPerPage > 0 ? Math.max(1, Math.ceil(count / rowsPerPage)) : 1
  const currentPage = Math.min(page, totalPages - 1)
  const from = count === 0 ? 0 : currentPage * rowsPerPage + 1
  const to = count === 0 ? 0 : Math.min(count, (currentPage + 1) * rowsPerPage)
  const displayedLabel =
    labelDisplayedRows?.({ from, to, count, page: currentPage }) ?? `${from}-${to} de ${count}`
  const { className, rest } = useCompatClassName(
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1.5,
      flexWrap: 'wrap',
      paddingTop: 1.25,
      paddingBottom: 1.25,
      paddingLeft: 1.5,
      paddingRight: 1.5,
      borderTop: '1px solid',
      borderColor: 'divider',
      color: 'text.secondary',
      fontSize: 13,
    },
    restProps,
  )
  const Comp = component ?? 'div'

  return React.createElement(
    Comp,
    { ...rest, className, style },
    <>
      <div className="flex flex-wrap items-center gap-3">
        {rowsPerPageOptions.length > 1 ? (
          <label className="flex items-center gap-2">
            {labelRowsPerPage ? <span>{labelRowsPerPage}</span> : null}
            <select
              aria-label={labelRowsPerPage || 'Linhas por página'}
              value={rowsPerPage}
              className="h-9 rounded-md border border-[var(--border-default)] bg-background px-2 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              onChange={(event) => onRowsPerPageChange?.(event)}
            >
              {rowsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : labelRowsPerPage ? (
          <span>{labelRowsPerPage}</span>
        ) : null}
        <span>{displayedLabel}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={currentPage <= 0}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-default)] bg-transparent text-[var(--text-primary)] transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(event) => onPageChange?.(event, currentPage - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="Próxima página"
          disabled={currentPage >= totalPages - 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-default)] bg-transparent text-[var(--text-primary)] transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(event) => onPageChange?.(event, currentPage + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </>,
  )
}

function maxWidthToPx(value) {
  switch (value) {
    case 'xs':
      return 444
    case 'sm':
      return 600
    case 'md':
      return 900
    case 'lg':
      return 1200
    case 'xl':
      return 1536
    default:
      return 600
  }
}

export const Dialog: any = function Dialog({ open, onClose, children, maxWidth = 'sm', fullWidth, PaperProps }) {
  return (
    <PrimitiveDialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <PrimitiveDialogContent
        className={useSxClassName(
          mergeSx(
            {
              width: fullWidth ? 'min(100%, 96vw)' : 'auto',
              maxWidth: `${maxWidthToPx(maxWidth)}px`,
              maxHeight: '90vh',
              overflow: 'auto',
              padding: 0,
              backgroundColor: 'background.paper',
              borderColor: 'divider',
            },
            PaperProps?.sx,
          ),
        )}
      >
        {children}
      </PrimitiveDialogContent>
    </PrimitiveDialog>
  )
}

export const DialogTitle: any = createPrimitive('div', {
  paddingLeft: 3,
  paddingRight: 3,
  paddingTop: 2.5,
  paddingBottom: 1.5,
  fontSize: 18,
  fontWeight: 700,
})

export const DialogContent: any = createPrimitive('div', {
  paddingLeft: 3,
  paddingRight: 3,
  paddingBottom: 3,
})

export const DialogActions: any = createPrimitive('div', {
  paddingLeft: 3,
  paddingRight: 3,
  paddingBottom: 2.5,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 1,
})

function useOverlayPosition({
  open,
  anchorEl,
  anchorOrigin,
  transformOrigin,
  anchorReference,
  anchorPosition,
  placement,
}) {
  const ref = React.useRef(null)
  const [style, setStyle] = React.useState({ top: -9999, left: -9999, visibility: 'hidden' })

  React.useLayoutEffect(() => {
    if (!open || !canUseDom()) return

    const element = ref.current
    if (!element) return

    const overlayRect = element.getBoundingClientRect()
    let top = 8
    let left = 8

    if (anchorReference === 'anchorPosition' && anchorPosition) {
      top = anchorPosition.top
      left = anchorPosition.left
    } else if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect()

      if (placement) {
        const [vertical, horizontal = 'center'] = placement.split('-')
        top = vertical === 'top' ? rect.top - overlayRect.height : rect.bottom
        left =
          horizontal === 'start'
            ? rect.left
            : horizontal === 'end'
              ? rect.right - overlayRect.width
              : rect.left + rect.width / 2 - overlayRect.width / 2
      } else {
        const anchorV = anchorOrigin?.vertical ?? 'top'
        const anchorH = anchorOrigin?.horizontal ?? 'left'
        const transformV = transformOrigin?.vertical ?? 'top'
        const transformH = transformOrigin?.horizontal ?? 'left'

        const anchorY =
          anchorV === 'bottom' ? rect.bottom : anchorV === 'center' ? rect.top + rect.height / 2 : rect.top
        const anchorX =
          anchorH === 'right' ? rect.right : anchorH === 'center' ? rect.left + rect.width / 2 : rect.left
        const transformY =
          transformV === 'bottom'
            ? overlayRect.height
            : transformV === 'center'
              ? overlayRect.height / 2
              : 0
        const transformX =
          transformH === 'right'
            ? overlayRect.width
            : transformH === 'center'
              ? overlayRect.width / 2
              : 0

        top = anchorY - transformY
        left = anchorX - transformX
      }
    }

    const clampedTop = Math.max(8, Math.min(top, window.innerHeight - overlayRect.height - 8))
    const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - overlayRect.width - 8))
    setStyle({ top: clampedTop, left: clampedLeft, visibility: 'visible' })
  }, [anchorEl, anchorOrigin, anchorPosition, anchorReference, open, placement, transformOrigin])

  return { ref, style }
}

function OverlaySurface({
  open,
  onClose,
  anchorEl,
  anchorOrigin,
  transformOrigin,
  anchorReference,
  anchorPosition,
  placement,
  paperSx,
  rootProps,
  listProps,
  children,
}) {
  const { ref, style } = useOverlayPosition({
    open,
    anchorEl,
    anchorOrigin,
    transformOrigin,
    anchorReference,
    anchorPosition,
    placement,
  })
  const panelClassName = useSxClassName(
    mergeSx(
      {
        position: 'fixed',
        zIndex: 1200,
        minWidth: 220,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 'var(--radius-md)',
        boxShadow: 8,
        overflow: 'hidden',
      },
      paperSx,
    ),
  )
  const listClassName = useSxClassName(
    mergeSx(
      {
        display: 'flex',
        flexDirection: 'column',
        padding: listProps?.disablePadding ? 0 : 0.5,
      },
      listProps?.sx,
    ),
  )

  React.useEffect(() => {
    if (!open || !canUseDom()) return

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (ref.current?.contains(target)) return
      if (anchorEl?.contains?.(target)) return
      onClose?.()
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [anchorEl, onClose, open, ref])

  if (!open || !canUseDom()) return null

  return createPortal(
    <div {...rootProps}>
      <div ref={ref} className={panelClassName} style={style}>
        <div className={listClassName}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export const Menu: any = function Menu({
  open,
  onClose,
  anchorEl,
  anchorOrigin,
  transformOrigin,
  anchorReference,
  anchorPosition,
  PaperProps,
  MenuListProps,
  slotProps,
  children,
}) {
  return (
    <OverlaySurface
      open={open}
      onClose={onClose}
      anchorEl={anchorEl}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      anchorReference={anchorReference}
      anchorPosition={anchorPosition}
      paperSx={mergeSx(PaperProps?.sx, slotProps?.paper?.sx)}
      rootProps={slotProps?.root}
      listProps={MenuListProps}
    >
      {children}
    </OverlaySurface>
  )
}

export const Popover: any = function Popover({
  open,
  onClose,
  anchorEl,
  anchorOrigin,
  transformOrigin,
  slotProps,
  children,
}) {
  return (
    <OverlaySurface
      open={open}
      onClose={onClose}
      anchorEl={anchorEl}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      paperSx={slotProps?.paper?.sx}
      rootProps={slotProps?.root}
      listProps={{ disablePadding: true }}
    >
      {children}
    </OverlaySurface>
  )
}

export const Popper: any = function Popper({ open, anchorEl, placement = 'bottom', children, style, ...restProps }) {
  const { ref, style: positionStyle } = useOverlayPosition({
    open,
    anchorEl,
    placement,
  })
  const { className, rest } = useCompatClassName(
    {
      position: 'fixed',
      zIndex: 1200,
    },
    restProps,
  )

  if (!open || !canUseDom()) return null

  return createPortal(
    <div {...rest} ref={ref} className={className} style={{ ...positionStyle, ...style }}>
      {children}
    </div>,
    document.body,
  )
}

const SelectContext = React.createContext({ inSelect: false })

export const FormControl: any = function FormControl({ children, style, ...restProps }) {
  const { className, rest } = useCompatClassName(
    {
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
      minWidth: 0,
    },
    restProps,
  )
  return (
    <div {...rest} className={className} style={style}>
      {children}
    </div>
  )
}

export const InputLabel: any = function InputLabel({ children, style, ...restProps }) {
  const { className, rest } = useCompatClassName(
    {
      fontSize: 13,
      fontWeight: 600,
      color: 'text.secondary',
    },
    restProps,
  )
  return (
    <label {...rest} className={className} style={style}>
      {children}
    </label>
  )
}

function FieldFrame({
  label,
  helperText,
  error,
  fullWidth,
  margin,
  InputProps,
  children,
  rootSx,
}) {
  const wrapperClass = useSxClassName(
    mergeSx(
      {
        width: fullWidth ? '100%' : undefined,
        marginTop: margin === 'normal' ? 1 : undefined,
        marginBottom: margin === 'normal' ? 1 : undefined,
      },
      rootSx,
    ),
  )
  const fieldClass = useSxClassName({
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    width: '100%',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    borderColor: error ? 'error.main' : 'divider',
    backgroundColor: 'background.paper',
    paddingLeft: 1,
    paddingRight: 1,
    '&:focus-within': {
      borderColor: 'primary.main',
      boxShadow: '0 0 0 3px rgba(62, 99, 184, 0.12)',
    },
  })

  return (
    <div className={wrapperClass}>
      {label ? <label className="MuiInputLabel-root mb-1 block text-[13px] font-semibold text-[var(--text-secondary)]">{label}</label> : null}
      <div className={cn('MuiInputBase-root MuiOutlinedInput-root relative', fieldClass)}>
        {InputProps?.startAdornment ? <span className="MuiInputAdornment-root inline-flex items-center">{InputProps.startAdornment}</span> : null}
        <span className="MuiOutlinedInput-notchedOutline pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent" />
        {children}
        {InputProps?.endAdornment ? <span className="MuiInputAdornment-root inline-flex items-center">{InputProps.endAdornment}</span> : null}
      </div>
      {helperText ? (
        <span className={cn('mt-1 text-xs', error ? 'text-red-600' : 'text-[var(--text-secondary)]')}>{helperText}</span>
      ) : null}
    </div>
  )
}

export const Select: any = function Select({ children, style, ...props }) {
  const { label, fullWidth, margin, InputProps, error, helperText, ...restProps } = props
  const { className, rest } = useCompatClassName(
    {
      width: '100%',
      minHeight: 40,
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
      color: 'text.primary',
      paddingTop: 1,
      paddingBottom: 1,
      appearance: 'none',
      cursor: 'pointer',
    },
    restProps,
  )
  return (
    <FieldFrame
      label={label}
      fullWidth={fullWidth}
      margin={margin}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <>
            {InputProps?.endAdornment}
            <ChevronDown size={16} />
          </>
        ),
      }}
      helperText={helperText}
      error={error}
    >
      <SelectContext.Provider value={{ inSelect: true }}>
        <select {...rest} className={cn('MuiSelect-select', className)} style={style}>
          {children}
        </select>
      </SelectContext.Provider>
    </FieldFrame>
  )
}

export const MenuItem: any = function MenuItem({ children, style, ...props }) {
  const context = React.useContext(SelectContext)

  if (context?.inSelect) {
    const { className, rest } = useCompatClassName(undefined, props)
    return (
      <option {...rest} className={className} style={style}>
        {children}
      </option>
    )
  }

  const { className, rest } = useCompatClassName(
    {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      paddingLeft: 1.5,
      paddingRight: 1.5,
      paddingTop: 1,
      paddingBottom: 1,
      borderRadius: 'var(--radius-sm)',
      backgroundColor: 'transparent',
      textAlign: 'left',
      '&:hover': {
        backgroundColor: 'action.hover',
      },
    },
    props,
  )
  return (
    <button {...rest} className={className} style={style} type="button">
      {children}
    </button>
  )
}

export const TextField: any = function TextField({
  label,
  helperText,
  fullWidth,
  margin,
  multiline,
  rows,
  select,
  InputProps,
  inputProps,
  inputRef,
  error,
  children,
  style,
  sx,
  ...restProps
}) {
  if (select) {
    return (
      <Select
        {...restProps}
        label={label}
        helperText={helperText}
        fullWidth={fullWidth}
        margin={margin}
        InputProps={InputProps}
        error={error}
        style={style}
        sx={sx}
      >
        {children}
      </Select>
    )
  }

  const fieldProps = {
    ...inputProps,
    ...restProps,
    ref: inputRef,
    className: cn(
      multiline ? 'MuiInputBase-input MuiOutlinedInput-input min-h-[80px] resize-y bg-transparent' : 'MuiInputBase-input MuiOutlinedInput-input bg-transparent',
      'w-full border-none outline-none',
    ),
    style: {
      paddingTop: multiline ? '8px' : '10px',
      paddingBottom: multiline ? '8px' : '10px',
      ...(inputProps?.style ?? {}),
    },
  }

  return (
    <FieldFrame
      label={label}
      fullWidth={fullWidth}
      margin={margin}
      helperText={helperText}
      error={error}
      InputProps={InputProps}
      rootSx={sx}
    >
      {multiline ? <Textarea rows={rows} {...fieldProps} /> : <Input {...fieldProps} />}
    </FieldFrame>
  )
}

export const Checkbox: any = function Checkbox({ checked, onChange, inputProps, style, ...restProps }) {
  const { className, rest } = useCompatClassName(
    {
      width: 18,
      height: 18,
      accentColor: 'primary.main',
      cursor: 'pointer',
    },
    restProps,
  )

  return (
    <input
      {...rest}
      {...inputProps}
      checked={checked}
      ref={rest.ref}
      type="checkbox"
      className={className}
      style={style}
      onChange={(event) => onChange?.(event, event.target.checked)}
    />
  )
}

export const Switch: any = function Switch({ checked, onChange, disabled, inputProps, style, ...restProps }) {
  const theme = useTheme()
  const { className, rest } = useCompatClassName(
    {
      position: 'relative',
      display: 'inline-flex',
      width: 38,
      height: 22,
      borderRadius: '999px',
      backgroundColor: checked ? 'primary.main' : theme.palette.mode === 'light' ? '#cbd5e1' : '#334155',
      transition: 'background-color 160ms ease',
      cursor: disabled ? 'not-allowed' : 'pointer',
      '&::after': {
        content: '""',
        position: 'absolute',
        top: '2px',
        left: checked ? '18px' : '2px',
        width: '18px',
        height: '18px',
        borderRadius: '999px',
        backgroundColor: '#fff',
        transition: 'left 160ms ease',
      },
    },
    restProps,
  )

  return (
    <label className={className} style={style}>
      <input
        {...rest}
        {...inputProps}
        checked={checked}
        disabled={disabled}
        type="checkbox"
        className="sr-only"
        onChange={(event) => onChange?.(event, event.target.checked)}
      />
    </label>
  )
}

export const FormControlLabel: any = function FormControlLabel({ control, label, style, ...restProps }) {
  const { className, rest } = useCompatClassName(
    {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75,
      cursor: 'pointer',
    },
    restProps,
  )

  return (
    <label {...rest} className={className} style={style}>
      {control}
      <span className="MuiFormControlLabel-label">{label}</span>
    </label>
  )
}

export const ClickAwayListener: any = function ClickAwayListener({ onClickAway, children }) {
  const ref = React.useRef(null)

  React.useEffect(() => {
    if (!canUseDom()) return
    const handle = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (ref.current?.contains(target)) return
      onClickAway?.(event)
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('touchstart', handle)
    }
  }, [onClickAway])

  return (
    <span ref={ref} style={{ display: 'contents' }}>
      {children}
    </span>
  )
}

export const InputAdornment: any = createPrimitive('span', {
  display: 'inline-flex',
  alignItems: 'center',
  color: 'text.secondary',
})

export const List: any = createPrimitive('div', {
  display: 'flex',
  flexDirection: 'column',
})

export const ListItem: any = createPrimitive('div', {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  paddingLeft: 2,
  paddingRight: 2,
  paddingTop: 1,
  paddingBottom: 1,
})

export const ListItemIcon: any = createPrimitive('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'text.secondary',
})

export const ListItemText: any = function ListItemText({
  primary,
  secondary,
  primaryTypographyProps,
  secondaryTypographyProps,
  style,
  ...restProps
}) {
  const { className, rest } = useCompatClassName(
    {
      minWidth: 0,
      flex: 1,
    },
    restProps,
  )

  return (
    <div {...rest} className={className} style={style}>
      {primary != null ? <Typography variant="body2" {...primaryTypographyProps}>{primary}</Typography> : null}
      {secondary != null ? <Typography variant="caption" color="text.secondary" {...secondaryTypographyProps}>{secondary}</Typography> : null}
    </div>
  )
}

export const ListItemButton: any = React.forwardRef(function ListItemButton(props, ref) {
  const { children, style, ...restProps } = props
  const { className, rest } = useCompatClassName(
    {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: 'transparent',
      textAlign: 'left',
      '&:hover': {
        backgroundColor: 'action.hover',
      },
    },
    restProps,
  )
  return (
    <button {...rest} ref={ref} className={className} style={style} type="button">
      {children}
    </button>
  )
})

export const Badge: any = function Badge({ badgeContent, children, color = 'error', max = 99 }) {
  const display =
    typeof badgeContent === 'number' && badgeContent > max ? `${max}+` : badgeContent
  if (!display) return children

  return (
    <span className="relative inline-flex">
      {children}
      <span
        className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
        style={{
          background: color === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
          color: color === 'error' ? 'hsl(var(--destructive-foreground))' : 'hsl(var(--primary-foreground))',
        }}
      >
        {display}
      </span>
    </span>
  )
}

export const Snackbar: any = function Snackbar({
  open,
  onClose,
  autoHideDuration,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
  children,
}) {
  React.useEffect(() => {
    if (!open || !autoHideDuration) return
    const timer = window.setTimeout(() => onClose?.({}, 'timeout'), autoHideDuration)
    return () => window.clearTimeout(timer)
  }, [autoHideDuration, onClose, open])

  if (!open || !canUseDom()) return null

  const position = {
    top: anchorOrigin.vertical === 'top' ? 16 : undefined,
    bottom: anchorOrigin.vertical === 'bottom' ? 16 : undefined,
    left:
      anchorOrigin.horizontal === 'left'
        ? 16
        : anchorOrigin.horizontal === 'center'
          ? '50%'
          : undefined,
    right: anchorOrigin.horizontal === 'right' ? 16 : undefined,
    transform: anchorOrigin.horizontal === 'center' ? 'translateX(-50%)' : undefined,
  }

  return createPortal(
    <div style={{ position: 'fixed', zIndex: 1400, ...position }}>{children}</div>,
    document.body,
  )
}

export const Collapse: any = function Collapse({ in: isOpen, unmountOnExit, children, style, ...restProps }) {
  if (!isOpen && unmountOnExit) return null
  const { className, rest } = useCompatClassName(
    {
      display: isOpen ? 'block' : 'none',
      width: '100%',
    },
    restProps,
  )
  return (
    <div {...rest} className={className} style={style}>
      {children}
    </div>
  )
}

export const Drawer: any = function Drawer({ open, onClose, anchor = 'left', PaperProps, children }) {
  const panelClassName = useSxClassName(
    mergeSx(
      {
        position: 'fixed',
        top: 0,
        bottom: 0,
        width: PaperProps?.sx?.width ?? 420,
        maxWidth: '100vw',
        backgroundColor: 'background.paper',
        borderColor: 'divider',
        boxShadow: 10,
        zIndex: 1301,
        overflow: 'auto',
        ...(anchor === 'right'
          ? { right: 0, borderLeft: '1px solid' }
          : { left: 0, borderRight: '1px solid' }),
      },
      PaperProps?.sx,
    ),
  )

  if (!open || !canUseDom()) return null

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="fixed inset-0 z-[1300] bg-black/40"
      />
      <div className={panelClassName}>{children}</div>
    </>,
    document.body,
  )
}

function normalizeAutoValue(value, getOptionLabel) {
  if (value == null) return ''
  return getOptionLabel ? getOptionLabel(value) : value?.label ?? value?.name ?? value?.email ?? String(value)
}

export const Autocomplete: any = function Autocomplete({
  options,
  loading,
  value,
  onChange,
  getOptionLabel = normalizeAutoValue,
  isOptionEqualToValue = (left, right) => left === right,
  renderInput,
  renderOption,
  noOptionsText,
  disabled,
  slotProps,
  style,
  ...restProps
}) {
  const containerRef = React.useRef(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const filteredOptions = React.useMemo(() => {
    const lowered = query.trim().toLowerCase()
    if (!lowered) return options
    return options.filter((option) => getOptionLabel(option).toLowerCase().includes(lowered))
  }, [getOptionLabel, options, query])

  React.useEffect(() => {
    const selected = options.find((option) => isOptionEqualToValue(option, value))
    setQuery(selected ? getOptionLabel(selected) : '')
  }, [getOptionLabel, isOptionEqualToValue, options, value])

  React.useEffect(() => {
    if (!open) return
    const handle = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const input = renderInput?.({
    value: query,
    onChange: (event) => {
      setQuery(event.target.value)
      setOpen(true)
    },
    InputProps: {
      endAdornment: loading ? <CircularProgress size={16} /> : null,
    },
    inputProps: {
      value: query,
      onChange: (event) => {
        setQuery(event.target.value)
        setOpen(true)
      },
      onFocus: () => setOpen(true),
      disabled,
    },
  })

  const { className, rest } = useCompatClassName(
    {
      position: 'relative',
      width: '100%',
    },
    restProps,
  )

  return (
    <div {...rest} ref={containerRef} className={className} style={style}>
      {input}
      {open ? (
        <div
          className={useSxClassName(
            mergeSx(
              {
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 1302,
                maxHeight: 280,
                overflowY: 'auto',
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 'var(--radius-md)',
                boxShadow: 8,
              },
              slotProps?.popper?.sx,
            ),
          )}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">{loading ? 'Carregando...' : noOptionsText}</div>
          ) : (
            filteredOptions.map((option, index) => {
              const optionProps = {
                key: option.id ?? getOptionLabel(option) ?? index,
                onClick: () => {
                  onChange?.({}, option)
                  setQuery(getOptionLabel(option))
                  setOpen(false)
                },
                className:
                  'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
              }
              return renderOption ? (
                renderOption(optionProps, option)
              ) : (
                <button {...optionProps} type="button">
                  {getOptionLabel(option)}
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}

export const ListItemAvatar: any = function ListItemAvatar({ children, style, ...restProps }) {
  const { className, rest } = useCompatClassName(
    {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    restProps,
  )
  return (
    <span {...rest} className={className} style={style}>
      {children}
    </span>
  )
}

export { ThemeProvider, CssBaseline, useTheme }

