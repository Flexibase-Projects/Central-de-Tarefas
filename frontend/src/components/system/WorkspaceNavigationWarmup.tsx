import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { prefetchActivities } from '@/hooks/use-activities'
import { prefetchHome } from '@/hooks/use-home'
import { prefetchIndicators } from '@/hooks/use-indicators'
import { prefetchProjects } from '@/hooks/use-projects'
import { stripWorkspacePrefix } from '@/lib/workspace-routing'

const WARMUP_DELAY_MS = 700

function isProjectsRoute(pathname: string): boolean {
  return pathname === '/desenvolvimentos' || pathname === '/mapa' || pathname === '/prioridades'
}

export function WorkspaceNavigationWarmup() {
  const location = useLocation()
  const { currentUser, currentWorkspace, getAuthHeaders, hasRole } = useAuth()
  const normalizedPath = stripWorkspacePrefix(location.pathname)
  const workspaceSlug = currentWorkspace?.slug ?? null
  const userId = currentUser?.id ?? null
  const isAdmin = hasRole('admin')

  useEffect(() => {
    if (!workspaceSlug || !userId) {
      return
    }

    const timer = window.setTimeout(() => {
      const cacheKey = `${workspaceSlug}:${userId}`
      const tasks: Promise<unknown>[] = []

      if (normalizedPath !== '/') {
        tasks.push(prefetchHome({ cacheKey, getAuthHeaders }))
      }

      if (!isProjectsRoute(normalizedPath)) {
        tasks.push(prefetchProjects({ cacheKey, getAuthHeaders }))
      }

      if (!normalizedPath.startsWith('/atividades')) {
        tasks.push(prefetchActivities({ cacheKey, getAuthHeaders }))
      }

      if (normalizedPath !== '/' && normalizedPath !== '/indicadores') {
        tasks.push(
          prefetchIndicators({
            cacheKey: `${workspaceSlug}:${userId}:me`,
            scope: 'me',
            resolvedUserId: userId,
            getAuthHeaders,
          }),
        )

        if (isAdmin) {
          tasks.push(
            prefetchIndicators({
              cacheKey: `${workspaceSlug}:${userId}:team`,
              scope: 'team',
              resolvedUserId: userId,
              getAuthHeaders,
            }),
          )
        }
      }

      void Promise.allSettled(tasks)
    }, WARMUP_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [getAuthHeaders, isAdmin, normalizedPath, userId, workspaceSlug])

  return null
}
