/**
 * Gera abreviação do nome do projeto: primeiras letras de cada palavra
 * significativa (palavras com mais de 2 caracteres), até 3 letras.
 * Ex: "Central de Tarefas" -> "CT", "Projeto Alpha Beta" -> "PAB"
 */
export function abbreviateProjectName(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2)
  const letters = words.slice(0, 3).map((w) => w[0])
  return letters.join('').toUpperCase() || name.slice(0, 2).toUpperCase()
}

/**
 * Texto exibido na bolha do mapa:
 * - Nome completo se tiver ≤3 caracteres (ex: API, CDT).
 * - Se a abreviação ficar só 1 letra → 3 primeiras letras do nome (ex: Ferramentaria → FER).
 * - Se a primeira palavra tiver ≤3 caracteres → primeira palavra (ex: PDF TOOLS → PDF).
 * - Senão → abreviação normal (ex: Central de Tarefas → CT).
 */
export function mapBubbleLabel(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length <= 3) return trimmed
  const abbr = abbreviateProjectName(name)
  if (abbr.length === 1) return trimmed.slice(0, 3).toUpperCase()
  const firstWord = trimmed.split(/\s+/)[0] ?? ''
  if (firstWord.length <= 3) return firstWord.toUpperCase()
  return abbr
}
