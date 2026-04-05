import { useMemo } from 'react'
import {
  buildSuperhotEmberConfigs,
  type SuperhotEmberVariant,
} from '@/components/gamification/superhot-ember-seed'

type SuperhotEmberParticlesProps = {
  seed: string
  variant: SuperhotEmberVariant
  size?: 'sm' | 'md'
}

export function SuperhotEmberParticles({ seed, variant, size = 'md' }: SuperhotEmberParticlesProps) {
  const configs = useMemo(
    () => buildSuperhotEmberConfigs(seed, variant, size),
    [seed, variant, size],
  )

  const containerClass =
    variant === 'avatar-orbit'
      ? 'cdt-superhot-embers cdt-superhot-embers--avatar-' + size
      : variant === 'tooltip-bar'
        ? 'cdt-superhot-embers cdt-superhot-embers--tooltip'
        : 'cdt-superhot-embers cdt-superhot-embers--inline-left'

  return (
    <span className={containerClass} aria-hidden>
      {configs.map((c, i) => (
        <span
          key={i}
          className="cdt-superhot-ember"
          style={{
            left: c.leftPct + '%',
            bottom: c.bottomPct + '%',
            width: Math.max(4, c.w),
            height: Math.max(8, c.h),
            animationDelay: c.delayMs + 'ms',
            animationDuration: c.durationMs + 'ms',
          }}
        />
      ))}
    </span>
  )
}

