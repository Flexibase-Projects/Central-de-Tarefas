export type SuperhotEmberVariant = 'avatar-orbit' | 'tooltip-bar' | 'inline-left'

export type SuperhotEmberParticleConfig = {
  leftPct: number
  bottomPct: number
  driftX: number
  rise: number
  delayMs: number
  durationMs: number
  w: number
  h: number
  rot: number
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng()
}

export function buildSuperhotEmberConfigs(
  seed: string,
  variant: SuperhotEmberVariant,
  size: 'sm' | 'md' = 'md',
): SuperhotEmberParticleConfig[] {
  const rng = mulberry32(hashString('cdt-superhot-ember|' + variant + '|' + size + '|' + seed))
  const count =
    variant === 'avatar-orbit'
      ? size === 'sm'
        ? 9
        : 13
      : variant === 'tooltip-bar'
        ? 7
        : 9

  const out: SuperhotEmberParticleConfig[] = []

  for (let i = 0; i < count; i++) {
    if (variant === 'avatar-orbit') {
      out.push({
        leftPct: pick(rng, 14, 86),
        bottomPct: pick(rng, -4, 14),
        driftX: pick(rng, -10, 10),
        rise: pick(rng, -36, -18),
        delayMs: Math.round(pick(rng, 0, 2600)),
        durationMs: Math.round(pick(rng, 950, 1950)),
        w: Math.round(pick(rng, 2, 4)),
        h: Math.round(pick(rng, 4, 7)),
        rot: pick(rng, -18, 18),
      })
    } else if (variant === 'tooltip-bar') {
      out.push({
        leftPct: pick(rng, 8, 92),
        bottomPct: pick(rng, -2, 10),
        driftX: pick(rng, -7, 7),
        rise: pick(rng, -22, -10),
        delayMs: Math.round(pick(rng, 0, 2200)),
        durationMs: Math.round(pick(rng, 900, 1700)),
        w: Math.round(pick(rng, 2, 3)),
        h: Math.round(pick(rng, 3, 6)),
        rot: pick(rng, -12, 12),
      })
    } else {
      out.push({
        leftPct: pick(rng, -2, 6),
        bottomPct: pick(rng, 5, 92),
        driftX: pick(rng, 4, 18),
        rise: pick(rng, -28, -12),
        delayMs: Math.round(pick(rng, 0, 2400)),
        durationMs: Math.round(pick(rng, 1000, 2000)),
        w: Math.round(pick(rng, 2, 3)),
        h: Math.round(pick(rng, 4, 7)),
        rot: pick(rng, -25, 5),
      })
    }
  }

  return out
}
