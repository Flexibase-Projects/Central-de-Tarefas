import type { ReactNode } from 'react'
import { Box } from '@/compat/mui/material'
import { useDeliveryHeatForUser } from '@/contexts/DeliveryHeatContext'
import { SuperhotEmberParticles } from '@/components/gamification/SuperhotEmberParticles'
import type { DeliveryHeatTier } from '@/utils/delivery-heat'

function inlineClassForTier(tier: DeliveryHeatTier): string {
  if (tier === 'none') return ''
  if (tier === 'on_fire') return 'cdt-delivery-heat-inline cdt-delivery-heat-inline--on-fire'
  return `cdt-delivery-heat-inline cdt-delivery-heat-inline--${tier}`
}

type DeliveryHeatAssigneeInlineProps = {
  userId: string | null | undefined
  enabled?: boolean
  children: ReactNode
}

/** Realce lateral em blocos só texto (ex.: coluna responsável na lista de to-dos). */
export function DeliveryHeatAssigneeInline({
  userId,
  enabled = true,
  children,
}: DeliveryHeatAssigneeInlineProps) {
  const heat = useDeliveryHeatForUser(enabled ? userId : null)
  if (!heat || heat.tier === 'none') {
    return <>{children}</>
  }

  const cls = inlineClassForTier(heat.tier)

  return (
    <Box
      className={cls}
      sx={{ position: 'relative', overflow: 'visible', pl: 0.5, pr: 0.25 }}
      aria-label={`Entrega quente: ${heat.meta.label}`}
    >
      {heat.tier === 'superhot' ? (
        <SuperhotEmberParticles seed={userId ?? 'anon'} variant="inline-left" />
      ) : null}
      {children}
    </Box>
  )
}
