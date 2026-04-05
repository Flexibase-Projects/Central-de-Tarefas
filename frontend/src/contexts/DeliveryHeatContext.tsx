import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import type { WorkspaceManagedMember } from '@/types'
import {
  getDeliveryHeatMeta,
  getDeliveryHeatTier,
  type DeliveryHeatMeta,
  type DeliveryHeatTier,
} from '@/utils/delivery-heat'

export type DeliveryHeatResolved = {
  tier: DeliveryHeatTier
  meta: DeliveryHeatMeta
  count: number
}

type DeliveryHeatContextValue = {
  gamificationEnabled: boolean
  countByUserId: ReadonlyMap<string, number>
}

const DeliveryHeatContext = createContext<DeliveryHeatContextValue | null>(null)

type DeliveryHeatMapProviderProps = {
  children: ReactNode
  gamificationEnabled: boolean
  members: WorkspaceManagedMember[]
}

export function DeliveryHeatMapProvider({
  children,
  gamificationEnabled,
  members,
}: DeliveryHeatMapProviderProps) {
  const countByUserId = useMemo(() => {
    const map = new Map<string, number>()
    if (!gamificationEnabled) return map
    for (const member of members) {
      const n = member.gamification_peek?.todos_delivered_30d
      if (typeof n === 'number' && Number.isFinite(n)) {
        map.set(member.id, Math.max(0, Math.floor(n)))
      }
    }
    return map
  }, [gamificationEnabled, members])

  const value = useMemo<DeliveryHeatContextValue>(
    () => ({
      gamificationEnabled,
      countByUserId,
    }),
    [gamificationEnabled, countByUserId],
  )

  return (
    <DeliveryHeatContext.Provider value={value}>{children}</DeliveryHeatContext.Provider>
  )
}

/**
 * Quando gamificação está desligada ou não há userId, retorna null (UI neutra).
 * Com gamificação: sempre resolve contagem (0 se membro sem peek) e tier/meta.
 */
export function useDeliveryHeatForUser(
  userId: string | null | undefined,
): DeliveryHeatResolved | null {
  const ctx = useContext(DeliveryHeatContext)
  if (!ctx?.gamificationEnabled || !userId) return null
  const count = ctx.countByUserId.get(userId) ?? 0
  const tier = getDeliveryHeatTier(count)
  const meta = getDeliveryHeatMeta(tier)
  return { tier, meta, count }
}

export function useDeliveryHeatContext(): DeliveryHeatContextValue | null {
  return useContext(DeliveryHeatContext)
}
