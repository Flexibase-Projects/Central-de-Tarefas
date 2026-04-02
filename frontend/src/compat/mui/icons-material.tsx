import {
  Eye,
  EyeOff,
  Search as SearchIconGlyph,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'

function withCompatIcon(Component: typeof Eye) {
  return function CompatIcon({
    fontSize,
    ...props
  }: { fontSize?: 'small' | 'medium' | 'large' } & Record<string, unknown>) {
    const size = fontSize === 'small' ? 16 : fontSize === 'large' ? 22 : 18
    return <Component {...props} size={size} />
  }
}

export const ToggleOn = withCompatIcon(ToggleRight)
export const ToggleOff = withCompatIcon(ToggleLeft)
export const Visibility = withCompatIcon(Eye)
export const VisibilityOff = withCompatIcon(EyeOff)
export const Search = withCompatIcon(SearchIconGlyph)
export const Close = withCompatIcon(X)
