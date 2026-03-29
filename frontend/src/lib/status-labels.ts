import type { Activity, Project } from '@/types'

type StatusKey = Project['status'] | Activity['status']

export const STATUS_LABELS_PTBR: Record<StatusKey, string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluído',
}

export const PRIORITY_LABELS_PTBR: Record<NonNullable<Activity['priority']>, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS_PTBR[status as StatusKey] ?? status.replace(/_/g, ' ')
}

export function getPriorityLabel(priority: string | null | undefined): string {
  if (!priority) return 'Não definida'
  return PRIORITY_LABELS_PTBR[priority as Activity['priority']] ?? priority
}
