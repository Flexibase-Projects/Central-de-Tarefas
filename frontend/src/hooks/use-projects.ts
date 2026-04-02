import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Project } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { apiUrl } from '@/lib/api'

const projectCache = new Map<string, Project[]>()
const projectInFlight = new Map<string, Promise<Project[]>>()
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const REALTIME_ENABLED = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED === 'true'

async function fetchProjectsForCacheKey(
  cacheKey: string,
  getAuthHeaders: () => Record<string, string>,
  options?: { force?: boolean },
): Promise<Project[]> {
  if (!options?.force && projectCache.has(cacheKey)) {
    return projectCache.get(cacheKey) ?? []
  }

  const existingRequest = projectInFlight.get(cacheKey)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    const response = await fetch(apiUrl('/api/projects'), { headers: getAuthHeaders() })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText} - ${errorText}`)
    }
    const data = await response.json()
    const normalized = Array.isArray(data) ? data : []
    projectCache.set(cacheKey, normalized)
    return normalized
  })()

  projectInFlight.set(cacheKey, request)

  try {
    return await request
  } finally {
    if (projectInFlight.get(cacheKey) === request) {
      projectInFlight.delete(cacheKey)
    }
  }
}

export async function prefetchProjects(params: {
  cacheKey: string
  getAuthHeaders: () => Record<string, string>
  force?: boolean
}) {
  return fetchProjectsForCacheKey(params.cacheKey, params.getAuthHeaders, { force: params.force })
}

export function useProjects(enabled = true) {
  const { currentUser, currentWorkspace, getAuthHeaders } = useAuth()
  const cacheKey = useMemo(
    () => `${currentWorkspace?.slug ?? 'workspace'}:${currentUser?.id ?? 'anonymous'}`,
    [currentUser?.id, currentWorkspace?.slug],
  )
  const cachedProjects = projectCache.get(cacheKey) ?? []
  const [projects, setProjects] = useState<Project[]>(cachedProjects)
  const [loading, setLoading] = useState(enabled && cachedProjects.length === 0)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const commitProjects = useCallback((nextProjects: Project[] | ((prev: Project[]) => Project[])) => {
    setProjects((previous) => {
      const resolved = typeof nextProjects === 'function'
        ? (nextProjects as (prev: Project[]) => Project[])(previous)
        : nextProjects

      projectCache.set(cacheKey, resolved)
      return resolved
    })
  }, [cacheKey])

  const fetchProjects = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return projectCache.get(cacheKey) ?? []
    }

    try {
      setLoading(true)
      const data = await fetchProjectsForCacheKey(cacheKey, getAuthHeaders, { force: true })
      commitProjects(data)
      setError(null)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching projects:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [cacheKey, commitProjects, enabled, getAuthHeaders])

  useEffect(() => {
    const nextProjects = projectCache.get(cacheKey) ?? []
    setProjects(nextProjects)
    setLoading(enabled && nextProjects.length === 0)
    setError(null)
  }, [cacheKey, enabled])

  useEffect(() => {
    if (!enabled) return
    void fetchProjects()
  }, [enabled, fetchProjects])

  useEffect(() => {
    if (!SUPABASE_URL || !REALTIME_ENABLED) return

    const channel = supabase
      .channel(`cdt_projects_realtime:${cacheKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cdt_projects',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const row = payload.new as Record<string, unknown>
            const id = row.id as string
            commitProjects((prev) =>
              prev.map((project) => (project.id === id ? { ...project, ...row } as Project : project)),
            )
          }

          if (payload.eventType === 'INSERT' && payload.new) {
            const row = payload.new as Record<string, unknown>
            commitProjects((prev) => {
              if (prev.some((project) => project.id === row.id)) return prev
              return [row as unknown as Project, ...prev]
            })
          }

          if (payload.eventType === 'DELETE' && payload.old) {
            const row = payload.old as Record<string, unknown>
            const id = row.id as string
            commitProjects((prev) => prev.filter((project) => project.id !== id))
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          supabase.removeChannel(channel)
          channelRef.current = null
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [cacheKey, commitProjects])

  const createProject = async (project: Partial<Project>) => {
    try {
      const response = await fetch(apiUrl('/api/projects'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(project),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create project: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const newProject = await response.json()
      commitProjects((prev) => [newProject, ...prev])
      return newProject
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const response = await fetch(apiUrl(`/api/projects/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as { error?: string; message?: string } | null
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to update project')
      }
      const updatedProject = await response.json()
      commitProjects((prev) => prev.map((project) => (project.id === id ? updatedProject : project)))
      return updatedProject
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }

  const updateProjectWithOptimisticPosition = async (
    id: string,
    updates: Pick<Project, 'map_quadrant' | 'map_x' | 'map_y'>,
  ) => {
    commitProjects((prev) =>
      prev.map((project) => (project.id === id ? { ...project, ...updates } : project)),
    )

    try {
      const response = await fetch(apiUrl(`/api/projects/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update project')
      const updatedProject = await response.json()
      commitProjects((prev) => prev.map((project) => (project.id === id ? updatedProject : project)))
      return updatedProject
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
    }
  }

  const deleteProject = async (id: string) => {
    try {
      const response = await fetch(apiUrl(`/api/projects/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to delete project')
      commitProjects((prev) => prev.filter((project) => project.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }

  const moveProject = async (projectId: string, newStatus: Project['status']) => {
    return updateProject(projectId, { status: newStatus })
  }

  const updatePriorityOrder = async (orderedIds: string[]) => {
    if (orderedIds.length === 0) return
    const byId = new Map(projects.map((project) => [project.id, project]))
    const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as Project[]
    if (reordered.length !== orderedIds.length) return
    const previous = projects
    commitProjects(reordered)
    try {
      const response = await fetch(apiUrl('/api/projects/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ orderedIds }),
      })
      if (!response.ok) throw new Error('Falha ao salvar ordem de prioridades')
      const data = await response.json()
      commitProjects(Array.isArray(data) ? data : reordered)
      setError(null)
    } catch (err) {
      commitProjects(previous)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar ordem'
      setError(errorMessage)
      throw err
    }
  }

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    updateProjectWithOptimisticPosition,
    deleteProject,
    moveProject,
    updatePriorityOrder,
    refetch: fetchProjects,
  }
}
