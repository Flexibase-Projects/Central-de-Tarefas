import type { Project, ProjectMapPosition, EisenhowerQuadrant } from '@/types'

/**
 * Posição padrão quando o projeto ainda não tem posição salva no servidor.
 */
function defaultPosition(
  indexInQuadrant: number,
  quadrant: EisenhowerQuadrant
): ProjectMapPosition {
  const i = Math.max(0, indexInQuadrant)
  const col = i % 3
  const row = Math.floor(i / 3)
  const gap = 28
  const start = 12
  return {
    quadrant,
    x: Math.min(start + col * gap, 75),
    y: Math.min(start + row * gap, 75),
  }
}

/**
 * Retorna a posição no mapa a partir do projeto (API) ou posição padrão.
 * defaultIndex: índice entre projetos sem posição (para espalhar no quadrante 1).
 */
export function getProjectMapPosition(
  project: Project,
  defaultIndex: number
): ProjectMapPosition {
  const q = project.map_quadrant
  const x = project.map_x
  const y = project.map_y
  if (q != null && x != null && y != null) {
    return { quadrant: q as EisenhowerQuadrant, x, y }
  }
  return defaultPosition(defaultIndex, 1)
}
