import type { ExecutionViewMode } from '@/types'

function getViewPreferenceKey(params: {
  pageKey: string
  workspaceSlug?: string | null
  userId?: string | null
}) {
  return [
    'cdt',
    'execution-view',
    params.pageKey,
    params.workspaceSlug ?? 'workspace',
    params.userId ?? 'anon',
  ].join(':')
}

export function normalizeExecutionViewMode(value: string | null | undefined): ExecutionViewMode | null {
  if (value === 'list' || value === 'kanban') return value
  return null
}

export function readExecutionViewPreference(params: {
  pageKey: string
  workspaceSlug?: string | null
  userId?: string | null
}): ExecutionViewMode | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(getViewPreferenceKey(params))
  return normalizeExecutionViewMode(stored)
}

export function writeExecutionViewPreference(
  params: {
    pageKey: string
    workspaceSlug?: string | null
    userId?: string | null
  },
  mode: ExecutionViewMode,
) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getViewPreferenceKey(params), mode)
}
