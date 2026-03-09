import { useState, useEffect, useRef } from 'react'
import { Project } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const REALTIME_ENABLED = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED === 'true'

export function useProjects() {
  const { getAuthHeaders } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const url = API_URL ? `${API_URL}/api/projects` : '/api/projects'
      const response = await fetch(url, { headers: getAuthHeaders() })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText} - ${errorText}`)
      }
      const data = await response.json()
      setProjects(data)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // Atualização em tempo real (opcional): só conecta se VITE_SUPABASE_REALTIME_ENABLED=true
  useEffect(() => {
    if (!SUPABASE_URL || !REALTIME_ENABLED) return
    const channel = supabase
      .channel('cdt_projects_realtime')
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
            setProjects((prev) =>
              prev.map((p) => (p.id === id ? { ...p, ...row } as unknown as Project : p))
            )
          }
          if (payload.eventType === 'INSERT' && payload.new) {
            const row = payload.new as Record<string, unknown>
            setProjects((prev) => {
              if (prev.some((p) => p.id === row.id)) return prev
              return [row as unknown as Project, ...prev]
            })
          }
          if (payload.eventType === 'DELETE' && payload.old) {
            const row = payload.old as Record<string, unknown>
            const id = row.id as string
            setProjects((prev) => prev.filter((p) => p.id !== id))
          }
        }
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
  }, [])

  const createProject = async (project: Partial<Project>) => {
    try {
      const url = API_URL ? `${API_URL}/api/projects` : '/api/projects'
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(project),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create project: ${response.status} ${response.statusText} - ${errorText}`)
      }
      
      const newProject = await response.json()
      setProjects(prev => [newProject, ...prev])
      return newProject
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const url = API_URL ? `${API_URL}/api/projects/${id}` : `/api/projects/${id}`
      const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update project')
      const updatedProject = await response.json()
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p))
      return updatedProject
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }

  /** Atualiza posição no mapa: aplica no estado na hora e persiste em background. */
  const updateProjectWithOptimisticPosition = async (
    id: string,
    updates: Pick<Project, 'map_quadrant' | 'map_x' | 'map_y'>
  ) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
    try {
      const url = API_URL ? `${API_URL}/api/projects/${id}` : `/api/projects/${id}`
      const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update project')
      const updatedProject = await response.json()
      setProjects((prev) => prev.map((p) => (p.id === id ? updatedProject : p)))
      return updatedProject
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
    }
  }

  const deleteProject = async (id: string) => {
    try {
      const url = API_URL ? `${API_URL}/api/projects/${id}` : `/api/projects/${id}`
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to delete project')
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }

  const moveProject = async (projectId: string, newStatus: Project['status']) => {
    return updateProject(projectId, { status: newStatus })
  }

  /** Atualiza a ordem de prioridade (tela Prioridades). orderedIds = ordem do mais ao menos importante. */
  const updatePriorityOrder = async (orderedIds: string[]) => {
    if (orderedIds.length === 0) return
    const byId = new Map(projects.map((p) => [p.id, p]))
    const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as Project[]
    if (reordered.length !== orderedIds.length) return
    const previous = projects
    setProjects(reordered)
    try {
      const url = API_URL ? `${API_URL}/api/projects/reorder` : '/api/projects/reorder'
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ orderedIds }),
      })
      if (!response.ok) throw new Error('Falha ao salvar ordem de prioridades')
      const data = await response.json()
      setProjects(Array.isArray(data) ? data : reordered)
      setError(null)
    } catch (err) {
      setProjects(previous)
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
