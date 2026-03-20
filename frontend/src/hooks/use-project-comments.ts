import { useState, useEffect, useCallback, useRef } from 'react'
import { Comment } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

export type CommentsScope =
  | { projectId: string; activityId?: never }
  | { activityId: string; projectId?: never }

export function useProjectComments(scope: CommentsScope | null) {
  const { getAuthHeaders } = useAuth()
  const projectId = scope && 'projectId' in scope ? scope.projectId : null
  const activityId = scope && 'activityId' in scope ? scope.activityId : null
  const hasScope = Boolean(projectId || activityId)

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(() => hasScope)
  const [error, setError] = useState<string | null>(null)
  /** Evita aplicar resposta antiga se projectId/activityId mudarem ou houver refetch rápido */
  const fetchGenerationRef = useRef(0)

  const fetchComments = useCallback(
    async (options?: { silent?: boolean }) => {
      if (projectId == null && activityId == null) {
        fetchGenerationRef.current += 1
        setComments([])
        setLoading(false)
        return
      }

      const generation = ++fetchGenerationRef.current
      const silent = Boolean(options?.silent)

      try {
        if (!silent) setLoading(true)
        setError(null)
        const url = projectId
          ? API_URL
            ? `${API_URL}/api/project-comments/${projectId}`
            : `/api/project-comments/${projectId}`
          : API_URL
            ? `${API_URL}/api/project-comments/by-activity/${activityId}`
            : `/api/project-comments/by-activity/${activityId}`
        const response = await fetch(url, { headers: getAuthHeaders() })
        if (!response.ok) {
          throw new Error('Failed to fetch comments')
        }
        const data = await response.json()
        if (generation !== fetchGenerationRef.current) return
        setComments(Array.isArray(data) ? data : [])
      } catch (err) {
        if (generation !== fetchGenerationRef.current) return
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error fetching comments:', err)
      } finally {
        if (generation === fetchGenerationRef.current && !silent) {
          setLoading(false)
        }
      }
    },
    [projectId, activityId, getAuthHeaders],
  )

  useEffect(() => {
    void fetchComments()
  }, [fetchComments])

  const createComment = useCallback(
    async (comment: Partial<Comment>) => {
      try {
        const url = API_URL ? `${API_URL}/api/project-comments` : '/api/project-comments'
        const body =
          projectId != null
            ? {
                project_id: projectId,
                content: comment.content,
                author_name: comment.author_name,
                author_email: comment.author_email,
              }
            : {
                activity_id: activityId,
                content: comment.content,
                author_name: comment.author_name,
                author_email: comment.author_email,
              }
        const response = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        })
        if (!response.ok) {
          throw new Error('Failed to create comment')
        }
        const newComment = await response.json()
        setComments((prev) => [...prev, newComment])
        return newComment
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      }
    },
    [getAuthHeaders, projectId, activityId]
  )

  const updateComment = useCallback(
    async (id: string, content: string) => {
      try {
        const url = API_URL ? `${API_URL}/api/project-comments/${id}` : `/api/project-comments/${id}`
        const response = await fetch(url, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ content }),
        })
        if (!response.ok) {
          throw new Error('Failed to update comment')
        }
        const updatedComment = await response.json()
        setComments((prev) => prev.map((c) => (c.id === id ? updatedComment : c)))
        return updatedComment
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      }
    },
    [getAuthHeaders]
  )

  const deleteComment = useCallback(
    async (id: string) => {
      try {
        const url = API_URL ? `${API_URL}/api/project-comments/${id}` : `/api/project-comments/${id}`
        const response = await fetch(url, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })
        if (!response.ok) {
          throw new Error('Failed to delete comment')
        }
        setComments((prev) => prev.filter((c) => c.id !== id))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      }
    },
    [getAuthHeaders]
  )

  return {
    comments,
    loading,
    error,
    createComment,
    updateComment,
    deleteComment,
    refreshComments: fetchComments,
  }
}
