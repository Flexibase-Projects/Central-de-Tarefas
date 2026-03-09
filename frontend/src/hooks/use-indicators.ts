import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { IndicatorsData } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || ''

export function useIndicators() {
  const { getAuthHeaders } = useAuth()
  const [data, setData] = useState<IndicatorsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIndicators = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = API_URL ? `${API_URL}/api/indicators` : '/api/indicators'
      const response = await fetch(url, { headers: getAuthHeaders() })
      if (!response.ok) {
        throw new Error('Falha ao carregar indicadores')
      }
      const json = await response.json()
      setData(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar indicadores'
      setError(message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchIndicators()
  }, [fetchIndicators])

  return { data, loading, error, refresh: fetchIndicators }
}
