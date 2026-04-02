import type { XYPosition } from '@xyflow/react'

const LS_KEY_PREFIX = 'cdt-cost-canvas-positions-v1'

function getStorageKey(workspaceSlug?: string | null) {
  return workspaceSlug ? `${LS_KEY_PREFIX}:${workspaceSlug}` : LS_KEY_PREFIX
}

export function loadCostCanvasPositions(workspaceSlug?: string | null): Record<string, XYPosition> {
  try {
    const raw = localStorage.getItem(getStorageKey(workspaceSlug))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, XYPosition> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v && typeof v === 'object' && 'x' in v && 'y' in v) {
        const x = Number((v as { x: unknown }).x)
        const y = Number((v as { y: unknown }).y)
        if (Number.isFinite(x) && Number.isFinite(y)) out[k] = { x, y }
      }
    }
    return out
  } catch {
    return {}
  }
}

export function saveCostCanvasPositions(
  positions: Record<string, XYPosition>,
  workspaceSlug?: string | null,
) {
  try {
    localStorage.setItem(getStorageKey(workspaceSlug), JSON.stringify(positions))
  } catch {
    /* ignore quota */
  }
}
