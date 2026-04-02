import * as React from 'react'
import type { SxProps, Theme } from './styles'
import { useTheme } from './styles'

const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const

const BREAKPOINT_KEYS = Object.keys(BREAKPOINTS) as Array<keyof typeof BREAKPOINTS>
const UNIT_LESS_PROPERTIES = new Set([
  'fontWeight',
  'lineHeight',
  'opacity',
  'zIndex',
  'flex',
  'flexGrow',
  'flexShrink',
  'order',
  'zoom',
  'scale',
])
const SPACING_PROPERTIES = new Set([
  'gap',
  'rowGap',
  'columnGap',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
])
const SYSTEM_PROP_KEYS = new Set([
  'alignItems',
  'alignContent',
  'alignSelf',
  'background',
  'backgroundColor',
  'bgcolor',
  'border',
  'borderBottom',
  'borderBottomColor',
  'borderColor',
  'borderLeft',
  'borderLeftColor',
  'borderRadius',
  'borderRight',
  'borderRightColor',
  'borderTop',
  'borderTopColor',
  'bottom',
  'boxShadow',
  'color',
  'columnGap',
  'display',
  'flex',
  'flexBasis',
  'flexDirection',
  'flexGrow',
  'flexShrink',
  'flexWrap',
  'fontSize',
  'fontWeight',
  'gap',
  'gridAutoFlow',
  'gridColumn',
  'gridRow',
  'gridTemplateColumns',
  'gridTemplateRows',
  'height',
  'inset',
  'justifyContent',
  'justifyItems',
  'justifySelf',
  'left',
  'lineHeight',
  'm',
  'margin',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginTop',
  'maxHeight',
  'maxWidth',
  'mb',
  'minHeight',
  'minWidth',
  'ml',
  'mr',
  'mt',
  'mx',
  'my',
  'opacity',
  'outline',
  'overflow',
  'overflowX',
  'overflowY',
  'p',
  'padding',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'pb',
  'placeItems',
  'pl',
  'position',
  'pr',
  'pt',
  'px',
  'py',
  'right',
  'rowGap',
  'textAlign',
  'top',
  'transform',
  'transition',
  'visibility',
  'whiteSpace',
  'width',
  'zIndex',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeObjects(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...base }

  for (const [key, value] of Object.entries(override)) {
    if (value == null) continue

    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergeObjects(next[key] as Record<string, unknown>, value)
      continue
    }

    next[key] = value
  }

  return next
}

function resolveSxObject(theme: Theme, value: SxProps<Theme>): Record<string, unknown> {
  if (!value) return {}

  if (Array.isArray(value)) {
    return value.reduce<Record<string, unknown>>((accumulator, entry) => {
      if (!entry) return accumulator
      return mergeObjects(accumulator, resolveSxObject(theme, entry))
    }, {})
  }

  if (typeof value === 'function') {
    return resolveSxObject(theme, value(theme))
  }

  return value
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

function stringHash(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function resolveThemePath(theme: Theme, value: string): string | null {
  const path = value.split('.')
  let current: unknown = theme.palette

  if (path.length === 1) {
    current = (theme.palette as Record<string, unknown>)[path[0]]
    if (typeof current === 'string') return current
    if (isPlainObject(current) && typeof current.main === 'string') return current.main
  }

  for (const segment of path) {
    if (!isPlainObject(current) && typeof current !== 'object') return null
    current = (current as Record<string, unknown>)?.[segment]
  }

  return typeof current === 'string' ? current : null
}

function resolveShadow(theme: Theme, value: number): string {
  if (value <= 0) return 'none'

  const intensity = Math.min(value, 24)
  const blur = 8 + intensity * 2
  const spread = Math.max(0, intensity - 8)
  const alpha = theme.palette.mode === 'light' ? 0.06 + intensity * 0.004 : 0.14 + intensity * 0.004
  return `0 ${Math.round(intensity / 2)}px ${blur}px ${spread}px rgba(15, 23, 42, ${alpha.toFixed(3)})`
}

function resolveColorValue(theme: Theme, value: unknown): unknown {
  if (typeof value !== 'string') return value

  if (
    value.startsWith('#') ||
    value.startsWith('rgb') ||
    value.startsWith('hsl') ||
    value.startsWith('var(') ||
    value.startsWith('linear-gradient') ||
    value.startsWith('radial-gradient') ||
    value.startsWith('url(')
  ) {
    return value
  }

  return resolveThemePath(theme, value) ?? value
}

function resolveCssValue(theme: Theme, property: string, value: unknown): string {
  if (typeof value === 'function') {
    return resolveCssValue(theme, property, value(theme))
  }

  if (value == null || value === false) return ''

  if (property === 'boxShadow' && typeof value === 'number') {
    return resolveShadow(theme, value)
  }

  if (property === 'borderRadius' && typeof value === 'number') {
    return `${value * theme.shape.borderRadius}px`
  }

  if (
    ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'outline'].includes(property) &&
    typeof value === 'number'
  ) {
    return `${value}px solid ${theme.palette.divider}`
  }

  if (typeof value === 'number') {
    if (property === 'fontSize') return `${value}px`
    if (SPACING_PROPERTIES.has(property)) return theme.spacing(value)
    if (UNIT_LESS_PROPERTIES.has(property)) return String(value)
    return `${value}px`
  }

  if (typeof value === 'string') {
    if (
      property.includes('color') ||
      property === 'background' ||
      property === 'backgroundColor' ||
      property === 'border' ||
      property.startsWith('border') ||
      property === 'outline' ||
      property === 'fill' ||
      property === 'stroke'
    ) {
      return String(resolveColorValue(theme, value))
    }
  }

  return String(value)
}

function expandSystemProperty(
  property: string,
  value: unknown,
): Array<[string, unknown]> {
  switch (property) {
    case 'm':
      return [['margin', value]]
    case 'mx':
      return [
        ['marginLeft', value],
        ['marginRight', value],
      ]
    case 'my':
      return [
        ['marginTop', value],
        ['marginBottom', value],
      ]
    case 'mt':
      return [['marginTop', value]]
    case 'mr':
      return [['marginRight', value]]
    case 'mb':
      return [['marginBottom', value]]
    case 'ml':
      return [['marginLeft', value]]
    case 'p':
      return [['padding', value]]
    case 'px':
      return [
        ['paddingLeft', value],
        ['paddingRight', value],
      ]
    case 'py':
      return [
        ['paddingTop', value],
        ['paddingBottom', value],
      ]
    case 'pt':
      return [['paddingTop', value]]
    case 'pr':
      return [['paddingRight', value]]
    case 'pb':
      return [['paddingBottom', value]]
    case 'pl':
      return [['paddingLeft', value]]
    case 'bgcolor':
      return [['backgroundColor', value]]
    default:
      return [[property, value]]
  }
}

function isResponsiveValue(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false
  const keys = Object.keys(value)
  return keys.length > 0 && keys.every((key) => BREAKPOINT_KEYS.includes(key as keyof typeof BREAKPOINTS))
}

function buildCss(selector: string, input: Record<string, unknown>, theme: Theme): string {
  const baseDeclarations: string[] = []
  const responsiveDeclarations = new Map<keyof typeof BREAKPOINTS, string[]>()
  const nestedRules: string[] = []

  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (rawValue == null || rawValue === false) continue

    const value = typeof rawValue === 'function' ? rawValue(theme) : rawValue
    if (value == null || value === false) continue

    if (rawKey.startsWith('&')) {
      nestedRules.push(buildCss(rawKey.replace(/&/g, selector), value as Record<string, unknown>, theme))
      continue
    }

    if (rawKey.startsWith('@media')) {
      nestedRules.push(`${rawKey}{${buildCss(selector, value as Record<string, unknown>, theme)}}`)
      continue
    }

    for (const [property, expandedValue] of expandSystemProperty(rawKey, value)) {
      if (expandedValue == null || expandedValue === false) continue

      if (isResponsiveValue(expandedValue)) {
        for (const breakpoint of BREAKPOINT_KEYS) {
          const breakpointValue = expandedValue[breakpoint]
          if (breakpointValue == null) continue
          const cssProperty = toKebabCase(property)
          const cssValue = resolveCssValue(theme, property, breakpointValue)
          if (!cssValue) continue

          if (breakpoint === 'xs') {
            baseDeclarations.push(`${cssProperty}:${cssValue};`)
          } else {
            const bucket = responsiveDeclarations.get(breakpoint) ?? []
            bucket.push(`${cssProperty}:${cssValue};`)
            responsiveDeclarations.set(breakpoint, bucket)
          }
        }
        continue
      }

      const cssProperty = toKebabCase(property)
      const cssValue = resolveCssValue(theme, property, expandedValue)
      if (cssValue) {
        baseDeclarations.push(`${cssProperty}:${cssValue};`)
      }
    }
  }

  const baseRule = baseDeclarations.length > 0 ? `${selector}{${baseDeclarations.join('')}}` : ''
  const responsiveRules = Array.from(responsiveDeclarations.entries())
    .map(([breakpoint, declarations]) => {
      if (declarations.length === 0) return ''
      return `@media (min-width:${BREAKPOINTS[breakpoint]}px){${selector}{${declarations.join('')}}}`
    })
    .join('')

  return `${baseRule}${responsiveRules}${nestedRules.join('')}`
}

function ensureStyleTag(): HTMLStyleElement {
  const existing = document.getElementById('mui-compat-sx') as HTMLStyleElement | null
  if (existing) return existing

  const style = document.createElement('style')
  style.id = 'mui-compat-sx'
  document.head.appendChild(style)
  return style
}

const insertedRules = new Set<string>()

export function mergeSx(...entries: Array<SxProps<Theme> | Record<string, unknown> | null | undefined | false>) {
  const values = entries.filter(Boolean) as Array<SxProps<Theme> | Record<string, unknown>>
  if (values.length === 0) return undefined
  if (values.length === 1) return values[0]
  return values
}

export function splitSystemProps<T extends Record<string, unknown>>(props: T) {
  const system: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    if (SYSTEM_PROP_KEYS.has(key)) {
      system[key] = value
      continue
    }
    rest[key] = value
  }

  return {
    system,
    rest: rest as T,
  }
}

export function useSxClassName(
  sx: SxProps<Theme> | Record<string, unknown> | null | undefined | false,
): string {
  const theme = useTheme()

  const { className, css } = React.useMemo(() => {
    const object = resolveSxObject(theme, sx as SxProps<Theme>)
    const serialized = JSON.stringify(object)
    const hash = stringHash(`${theme.palette.mode}:${serialized}`)
    const generatedClassName = `mui-compat-${hash}`
    return {
      className: generatedClassName,
      css: buildCss(`.${generatedClassName}`, object, theme),
    }
  }, [sx, theme])

  React.useEffect(() => {
    if (!css || insertedRules.has(className) || typeof document === 'undefined') return
    const styleTag = ensureStyleTag()
    styleTag.appendChild(document.createTextNode(css))
    insertedRules.add(className)
  }, [className, css])

  return className
}
