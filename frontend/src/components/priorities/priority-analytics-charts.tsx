import { useMemo } from 'react'
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  useTheme,
  type Theme,
} from '@/compat/mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ExecutionCardSummaryRow, Project } from '@/types'

const STATUS_LABELS: Record<Project['status'], string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em progresso',
  review: 'Revisao',
  done: 'Concluido',
}

function truncateLabel(name: string, max = 36): string {
  if (name.length <= max) return name
  return `${name.slice(0, max - 1)}…`
}

function chartColors(theme: Theme) {
  const done = theme.palette?.success?.main ?? '#059669'
  const open = theme.palette?.action?.disabledBackground ?? 'rgba(0,0,0,0.12)'
  const accent = theme.palette?.primary?.main ?? '#2563eb'
  const grid = theme.palette?.divider ?? 'rgba(0,0,0,0.08)'
  const text = theme.palette?.text?.secondary ?? '#64748b'
  return { done, open, accent, grid, text }
}

type ScatterRow = {
  x: number
  y: number
  rank: number
  concluidos: number
  name: string
  abertos: number
  status: string
}

type BarRow = {
  key: string
  label: string
  name: string
  concluidos: number
  abertos: number
}

function ScatterTooltipBody({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ScatterRow }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <Paper variant="outlined" sx={{ px: 1.5, py: 1, bgcolor: 'background.paper', borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap title={row.name}>
        {row.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Posição na fila: {row.rank}
      </Typography>
      <Typography variant="caption" display="block">
        Concluídos: {row.concluidos} · Abertos: {row.abertos}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Status: {row.status}
      </Typography>
    </Paper>
  )
}

function BarTooltipBody({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
}) {
  if (!active || !payload?.length) return null
  return (
    <Paper variant="outlined" sx={{ px: 1.5, py: 1, bgcolor: 'background.paper', borderColor: 'divider' }}>
      {payload.map((entry) => (
        <Typography key={String(entry.name)} variant="caption" display="block">
          <Box component="span" sx={{ color: entry.color, fontWeight: 600 }}>{entry.name}: </Box>
          {entry.value ?? 0}
        </Typography>
      ))}
    </Paper>
  )
}

export interface PriorityAnalyticsChartsProps {
  projects: Project[]
  summaryByProjectId: Map<string, ExecutionCardSummaryRow>
  loadingSummary: boolean
  summaryError: string | null
}

export function PriorityAnalyticsCharts({
  projects,
  summaryByProjectId,
  loadingSummary,
  summaryError,
}: PriorityAnalyticsChartsProps) {
  const theme = useTheme()
  const { done, open, accent, grid, text } = chartColors(theme)

  const scatterData = useMemo((): ScatterRow[] => {
    return projects.map((project, index) => {
      const s = summaryByProjectId.get(project.id)
      const rank = index + 1
      const concluidos = s?.totalCompletedCount ?? 0
      return {
        x: rank,
        y: concluidos,
        rank,
        concluidos,
        abertos: s?.totalOpenCount ?? 0,
        name: project.name,
        status: STATUS_LABELS[project.status] ?? project.status,
      }
    })
  }, [projects, summaryByProjectId])

  const barData = useMemo((): BarRow[] => {
    return projects.map((project) => {
      const s = summaryByProjectId.get(project.id)
      return {
        key: project.id,
        label: truncateLabel(project.name),
        name: project.name,
        concluidos: s?.totalCompletedCount ?? 0,
        abertos: s?.totalOpenCount ?? 0,
      }
    })
  }, [projects, summaryByProjectId])

  const barHeight = Math.min(520, Math.max(220, barData.length * 32))

  if (loadingSummary && projects.length > 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, borderColor: 'divider' }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Carregando métricas de to-dos para os gráficos…
        </Typography>
      </Paper>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {summaryError ? (
        <Typography variant="body2" color="warning.main">
          {summaryError} — a lista de prioridades continua disponível.
        </Typography>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
          Prioridade × execução
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Eixo horizontal: posição na fila (1 = mais importante). Eixo vertical: to-dos concluídos no cartão do projeto.
        </Typography>
        <Box sx={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Fila"
                allowDecimals={false}
                tick={{ fill: text, fontSize: 11 }}
                label={{ value: 'Posição na fila', position: 'insideBottom', offset: -2, fill: text, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                allowDecimals={false}
                tick={{ fill: text, fontSize: 11 }}
                label={{ value: 'Concluídos', angle: -90, position: 'insideLeft', fill: text, fontSize: 11 }}
              />
              <Tooltip content={<ScatterTooltipBody />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Projetos" data={scatterData} fill={accent} />
            </ScatterChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
          Concluídos e abertos por projeto
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Mesma ordem da fila. Barras empilhadas: verde = concluídos, cinza = ainda abertos.
        </Typography>
        <Box sx={{ width: '100%', height: barHeight, overflowX: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={320}>
            <BarChart
              layout="vertical"
              data={barData}
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              barCategoryGap={6}
            >
              <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: text, fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={132}
                tick={{ fill: text, fontSize: 10 }}
                interval={0}
              />
              <Tooltip content={<BarTooltipBody />} />
              <Bar dataKey="concluidos" name="Concluídos" stackId="todos" fill={done} />
              <Bar dataKey="abertos" name="Abertos" stackId="todos" fill={open} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  )
}
