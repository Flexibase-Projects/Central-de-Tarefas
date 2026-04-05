export function formatProfileInitials(name: string | null | undefined): string {
  const value = (name ?? '').trim()
  if (!value) return '?'
  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return `${parts[0][0]?.toUpperCase() ?? ''}${parts[1][0]?.toUpperCase() ?? ''}` || '?'
}
