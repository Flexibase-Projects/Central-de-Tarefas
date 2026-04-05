/**
 * Delivery "heat" tiers from to-dos concluídos nos últimos 30 dias (mesma métrica que gamification_peek).
 * Só aplicar efeitos visuais quando a gamificação do workspace estiver ativa.
 */

export type DeliveryHeatTier = 'none' | 'hot' | 'superhot' | 'on_fire'

export type DeliveryHeatMeta = {
  tier: DeliveryHeatTier
  /** Rótulo curto para tooltip / acessibilidade */
  label: string
  accentColor: string
  /** Classe no wrapper do avatar (vazia se none) */
  cssClass: string
}

/** Inclusivo: hot ≥15 e <30, superhot ≥30 e <45, on_fire ≥45 */
export function getDeliveryHeatTier(count: number): DeliveryHeatTier {
  if (!Number.isFinite(count) || count < 0) return 'none'
  if (count >= 45) return 'on_fire'
  if (count >= 30) return 'superhot'
  if (count >= 15) return 'hot'
  return 'none'
}

export function getDeliveryHeatMeta(tier: DeliveryHeatTier): DeliveryHeatMeta {
  switch (tier) {
    case 'hot':
      return {
        tier,
        label: 'Quente',
        accentColor: '#ca8a04',
        cssClass: 'cdt-delivery-heat--hot',
      }
    case 'superhot':
      return {
        tier,
        label: 'Super quente',
        accentColor: '#f59e0b',
        cssClass: 'cdt-delivery-heat--superhot',
      }
    case 'on_fire':
      return {
        tier,
        label: 'Em chamas',
        /** Legível em tooltips; o anel no avatar usa branco quente no CSS */
        accentColor: '#b45309',
        cssClass: 'cdt-delivery-heat--on-fire',
      }
    default:
      return {
        tier: 'none',
        label: '',
        accentColor: 'transparent',
        cssClass: '',
      }
  }
}

export function resolveDeliveryHeat(count: number): { tier: DeliveryHeatTier; meta: DeliveryHeatMeta } {
  const tier = getDeliveryHeatTier(count)
  return { tier, meta: getDeliveryHeatMeta(tier) }
}
