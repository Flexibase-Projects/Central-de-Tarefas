import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''
const SAVE_DEBOUNCE_MS = 1500

/** Garante payload serializável para o backend (elements + appState com collaborators como array). */
function normalizeContent(content: Record<string, unknown>): Record<string, unknown> {
  const elements = Array.isArray(content.elements) ? content.elements : []
  const rawAppState = content.appState && typeof content.appState === 'object' && !Array.isArray(content.appState)
    ? (content.appState as Record<string, unknown>)
    : {}
  const appState = {
    ...rawAppState,
    collaborators: Array.isArray(rawAppState.collaborators) ? rawAppState.collaborators : [],
  }
  return { elements, appState }
}

export interface TeamCanvasData {
  id: string | null
  name: string
  content: Record<string, unknown>
  updated_at: string | null
}

export function useTeamCanvas() {
  const { getAuthHeaders } = useAuth()
  const [data, setData] = useState<TeamCanvasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContentRef = useRef<Record<string, unknown> | null>(null)

  const fetchCanvas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = API_URL ? `${API_URL}/api/team-canvas` : '/api/team-canvas'
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(`Falha ao carregar canva: ${res.status}`)
      const json = await res.json()
      setData({
        id: json.id ?? null,
        name: json.name ?? 'default',
        content: json.content && typeof json.content === 'object' ? json.content : {},
        updated_at: json.updated_at ?? null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar canva')
      setData({ id: null, name: 'default', content: {}, updated_at: null })
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchCanvas()
  }, [fetchCanvas])

  const saveContent = useCallback(
    async (content: Record<string, unknown>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      pendingContentRef.current = null

      setSaving(true)
      try {
        const url = API_URL ? `${API_URL}/api/team-canvas` : '/api/team-canvas'
        const payload = normalizeContent(content)
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Falha ao salvar canva: ${res.status}`)
        const json = await res.json()
        setData((prev) =>
          prev
            ? {
                ...prev,
                id: json.id ?? prev.id,
                content: json.content && typeof json.content === 'object' ? json.content : prev.content,
                updated_at: json.updated_at ?? null,
              }
            : prev
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao salvar canva')
      } finally {
        setSaving(false)
      }
    },
    [getAuthHeaders]
  )

  const scheduleSave = useCallback(
    (content: Record<string, unknown>) => {
      pendingContentRef.current = content
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        if (pendingContentRef.current) saveContent(pendingContentRef.current)
      }, SAVE_DEBOUNCE_MS)
    },
    [saveContent]
  )

  // Ao desmontar a página, envia pendências imediatamente (sem setState para evitar warning de unmount)
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      const pending = pendingContentRef.current
      pendingContentRef.current = null
      if (pending) {
        const url = API_URL ? `${API_URL}/api/team-canvas` : '/api/team-canvas'
        const payload = normalizeContent(pending)
        fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload),
        }).catch(() => {})
      }
    }
  }, [getAuthHeaders])

  return {
    data,
    loading,
    saving,
    error,
    refetch: fetchCanvas,
    saveContent: scheduleSave,
  }
}
