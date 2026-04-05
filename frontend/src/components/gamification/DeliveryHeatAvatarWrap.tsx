import type { ReactElement, ReactNode } from 'react'
import { useDeliveryHeatForUser } from '@/contexts/DeliveryHeatContext'
import { SuperhotEmberParticles } from '@/components/gamification/SuperhotEmberParticles'

type DeliveryHeatAvatarWrapProps = {
  userId: string | null | undefined
  /** Se false, não aplica efeito (ex.: gamificação off no pai) */
  enabled?: boolean
  size?: 'sm' | 'md'
  children: ReactElement | ReactNode
}

/**
 * Anel ao redor do avatar com gamificação: cinza (menos de 15 entregas em 30d) ou cores de heat.
 * Sem gamificação ou enabled=false: repassa só os filhos.
 */
export function DeliveryHeatAvatarWrap({
  userId,
  enabled = true,
  size = 'md',
  children,
}: DeliveryHeatAvatarWrapProps) {
  const heat = useDeliveryHeatForUser(enabled ? userId : null)
  if (!heat) {
    return <>{children}</>
  }

  const sizeClass = size === 'sm' ? 'cdt-delivery-heat-wrap--sm' : 'cdt-delivery-heat-wrap--md'

  if (heat.tier === 'none') {
    return (
      <span
        className={`cdt-delivery-heat-wrap ${sizeClass} cdt-delivery-heat--muted`}
        aria-label={`${heat.count} to-dos entregues nos últimos 30 dias`}
      >
        {children}
      </span>
    )
  }

  const { meta } = heat

  return (
    <span
      className={`cdt-delivery-heat-wrap ${sizeClass} ${meta.cssClass}`}
      aria-label={`Entrega quente: ${meta.label} (${heat.count} to-dos em 30 dias)`}
    >
      {heat.tier === 'superhot' ? (
        <SuperhotEmberParticles seed={userId ?? 'anon'} variant="avatar-orbit" size={size} />
      ) : null}
      {children}
    </span>
  )
}
