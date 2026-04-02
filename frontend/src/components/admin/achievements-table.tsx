import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@/compat/mui/material'
import { Plus, Pencil } from '@/components/ui/icons'
import { useAuth } from '@/contexts/AuthContext'
import type { Achievement } from '@/types'
import { apiUrl } from '@/lib/api'

type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
type AchievementMode = 'global_auto' | 'linked_item' | 'manual'

interface AchievementForm {
  slug: string
  name: string
  description: string
  icon: string
  category: string
  rarity: Rarity
  rewardXpFixed: number
  rewardPercent: number
  mode: AchievementMode
  conditionType: string
  conditionValue: number | ''
  isActive: boolean
}

const RARITY_OPTIONS: Array<{ value: Rarity; label: string }> = [
  { value: 'common', label: 'Comum' },
  { value: 'rare', label: 'Rara' },
  { value: 'epic', label: 'Epica' },
  { value: 'legendary', label: 'Lendaria' },
]

const CATEGORIES = ['geral', 'produtividade', 'colaboracao', 'streak', 'nivel', 'especial']
const ICON_OPTIONS = ['emoji_events', 'check_circle', 'flag', 'military_tech', 'auto_awesome', 'task_alt', 'stars']

const MODE_OPTIONS: Array<{ value: AchievementMode; label: string }> = [
  { value: 'global_auto', label: 'Global automatica' },
  { value: 'linked_item', label: 'Vinculada a item' },
  { value: 'manual', label: 'Manual' },
]

const CONDITION_TYPES = [
  { value: 'todos_completed', label: 'To-dos concluidos' },
  { value: 'activities_completed', label: 'Atividades concluidas' },
  { value: 'level_reached', label: 'Nivel atingido' },
  { value: 'total_xp', label: 'XP total' },
  { value: 'streak_days', label: 'Dias de streak' },
  { value: 'deadline_todos', label: 'To-dos no prazo' },
  { value: 'deadline_activities', label: 'Atividades no prazo' },
  { value: 'challenge_todos', label: 'To-dos com conquista' },
  { value: 'comments_count', label: 'Comentarios feitos' },
  { value: 'manual', label: 'Manual (admin)' },
]

const EMPTY_FORM: AchievementForm = {
  slug: '',
  name: '',
  description: '',
  icon: 'emoji_events',
  category: 'geral',
  rarity: 'common',
  rewardXpFixed: 0,
  rewardPercent: 0,
  mode: 'global_auto',
  conditionType: 'todos_completed',
  conditionValue: 1,
  isActive: true,
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) return '0.00'
  return value.toFixed(2)
}

function formatConditionValue(value: number | null | undefined): string {
  if (value == null) return '-'
  return Number.isInteger(value) ? String(value) : formatDecimal(value)
}

function achievementToForm(a: Achievement): AchievementForm {
  return {
    slug: a.slug ?? '',
    name: a.name,
    description: a.description,
    icon: a.icon,
    category: a.category,
    rarity: (a.rarity as Rarity) ?? 'common',
    rewardXpFixed: parseNumber(a.rewardXpFixed ?? a.xpBonus, 0),
    rewardPercent: parseNumber(a.rewardPercent, 0),
    mode: (a.mode as AchievementMode) ?? 'global_auto',
    conditionType: a.conditionType ?? 'manual',
    conditionValue: a.conditionValue ?? '',
    isActive: a.isActive ?? true,
  }
}

export function AchievementsAdminTable() {
  const { getAuthHeaders } = useAuth()

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Achievement | null>(null)
  const [form, setForm] = useState<AchievementForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const linkedModeLabel = useMemo(
    () => new Map(MODE_OPTIONS.map((entry) => [entry.value, entry.label])),
    [],
  )

  const conditionLabel = useMemo(
    () => new Map(CONDITION_TYPES.map((entry) => [entry.value, entry.label])),
    [],
  )

  const fetchAchievements = useCallback(async () => {
      try {
        setLoading(true)
        setError(null)
      const res = await fetch(apiUrl('/api/achievements', { includeInactive: 1 }), { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Achievement[] = await res.json()
      setAchievements(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conquistas')
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  async function handleToggleActive(achievement: Achievement) {
    try {
      const nextActive = !(achievement.isActive ?? true)
      const response = await fetch(apiUrl(`/api/achievements/${achievement.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ isActive: nextActive }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const updated: Achievement = await response.json()
      setAchievements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    } catch {
      // keep local state unchanged on toggle failure
    }
  }

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
    setDialogOpen(true)
  }

  function openEdit(achievement: Achievement) {
    setEditTarget(achievement)
    setForm(achievementToForm(achievement))
    setSaveError(null)
    setDialogOpen(true)
  }

  function setField<K extends keyof AchievementForm>(key: K, value: AchievementForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setSaveError('Nome e obrigatorio.')
      return
    }

    try {
      setSaving(true)
      setSaveError(null)

      const payload = {
        slug: form.slug.trim() || undefined,
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon.trim() || 'emoji_events',
        category: form.category,
        rarity: form.rarity,
        rewardXpFixed: parseNumber(form.rewardXpFixed, 0),
        rewardPercent: parseNumber(form.rewardPercent, 0),
        mode: form.mode,
        conditionType: form.conditionType,
        conditionValue: form.conditionValue === '' ? null : parseNumber(form.conditionValue, 0),
        isActive: form.isActive,
      }

      const isEditing = Boolean(editTarget)
      const response = await fetch(
        isEditing ? apiUrl(`/api/achievements/${editTarget?.id}`) : apiUrl('/api/achievements'),
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload),
        },
      )

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const saved: Achievement = await response.json()

      if (isEditing) {
        setAchievements((prev) => prev.map((a) => (a.id === saved.id ? saved : a)))
      } else {
        setAchievements((prev) => [saved, ...prev])
      }

      setDialogOpen(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar conquista')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ py: 3 }}>
        <Typography color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
        <Button size="small" onClick={fetchAchievements}>Tentar novamente</Button>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Conquistas ({achievements.length})</Typography>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={openCreate} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Nova Conquista
        </Button>
      </Box>

      {achievements.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.disabled">Nenhuma conquista cadastrada.</Typography>
          <Button size="small" sx={{ mt: 1 }} onClick={openCreate}>Criar primeira conquista</Button>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Icone</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Categoria</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Raridade</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>XP Fixo</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>% Bonus</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Modo</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Condicao</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Ativo</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Acoes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {achievements.map((achievement) => (
                <TableRow key={achievement.id} hover sx={{ opacity: (achievement.isActive ?? true) ? 1 : 0.55 }}>
                  <TableCell>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(124,58,237,0.08)', fontSize: 16 }}>
                      {achievement.icon.length <= 2 ? achievement.icon : '??'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>{achievement.name}</Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                      {achievement.description.length > 50 ? `${achievement.description.slice(0, 50)}...` : achievement.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: 12 }}>{achievement.category}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: 12 }}>{achievement.rarity}</Typography>
                  </TableCell>
                  <TableCell>
                    {(achievement.rewardXpFixed ?? achievement.xpBonus ?? 0) > 0 ? (
                      <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>
                        +{formatDecimal(parseNumber(achievement.rewardXpFixed ?? achievement.xpBonus, 0))} XP
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.disabled">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {(achievement.rewardPercent ?? 0) > 0 ? (
                      <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>
                        +{formatDecimal(parseNumber(achievement.rewardPercent, 0))}%
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.disabled">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: 12 }}>
                      {linkedModeLabel.get((achievement.mode as AchievementMode) ?? 'global_auto') ?? achievement.mode ?? 'global_auto'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: 12 }}>
                      {conditionLabel.get(achievement.conditionType ?? 'manual') ?? achievement.conditionType ?? 'manual'} ({formatConditionValue(achievement.conditionValue ?? null)})
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      size="small"
                      checked={achievement.isActive ?? true}
                      onChange={() => handleToggleActive(achievement)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(achievement)}>
                        <Pencil size={14} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Editar Conquista' : 'Nova Conquista'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              size="small"
              fullWidth
              required
              inputProps={{ maxLength: 80 }}
            />

            <TextField
              label="Slug (opcional)"
              value={form.slug}
              onChange={(e) => setField('slug', e.target.value)}
              size="small"
              fullWidth
              inputProps={{ maxLength: 80 }}
            />

            <TextField
              label="Descricao"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: 255 }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Icone base</InputLabel>
                <Select
                  value={ICON_OPTIONS.includes(form.icon) ? form.icon : ''}
                  label="Icone base"
                  onChange={(e) => setField('icon', String(e.target.value))}
                >
                  {ICON_OPTIONS.map((icon) => (
                    <MenuItem key={icon} value={icon}>{icon}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Icone custom"
                value={form.icon}
                onChange={(e) => setField('icon', e.target.value)}
                size="small"
                fullWidth
                helperText="Ex: ?? ou emoji_events"
                inputProps={{ maxLength: 40 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={form.category}
                  label="Categoria"
                  onChange={(e) => setField('category', String(e.target.value))}
                >
                  {CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Raridade</InputLabel>
                <Select
                  value={form.rarity}
                  label="Raridade"
                  onChange={(e) => setField('rarity', e.target.value as Rarity)}
                >
                  {RARITY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="XP Fixo"
                type="number"
                value={form.rewardXpFixed}
                onChange={(e) => setField('rewardXpFixed', parseNumber(e.target.value, 0))}
                size="small"
                fullWidth
                inputProps={{ min: 0, max: 10000, step: 0.01 }}
              />
              <TextField
                label="% Bonus"
                type="number"
                value={form.rewardPercent}
                onChange={(e) => setField('rewardPercent', parseNumber(e.target.value, 0))}
                size="small"
                fullWidth
                inputProps={{ min: 0, max: 500, step: 0.01 }}
              />
            </Box>

            <FormControl size="small" fullWidth>
              <InputLabel>Modo</InputLabel>
              <Select
                value={form.mode}
                label="Modo"
                onChange={(e) => setField('mode', e.target.value as AchievementMode)}
              >
                {MODE_OPTIONS.map((mode) => (
                  <MenuItem key={mode.value} value={mode.value}>{mode.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Tipo de condicao</InputLabel>
                <Select
                  value={form.conditionType}
                  label="Tipo de condicao"
                  onChange={(e) => setField('conditionType', String(e.target.value))}
                >
                  {CONDITION_TYPES.map((condition) => (
                    <MenuItem key={condition.value} value={condition.value}>{condition.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Valor"
                type="number"
                value={form.conditionValue}
                onChange={(e) => setField('conditionValue', e.target.value === '' ? '' : parseNumber(e.target.value, 0))}
                size="small"
                sx={{ minWidth: 120 }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setField('isActive', e.target.checked)}
                />
              }
              label={form.isActive ? 'Conquista ativa' : 'Conquista inativa'}
            />

            {saveError && (
              <Typography color="error" variant="caption">
                {saveError}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none', minWidth: 90 }}>
            {saving ? <CircularProgress size={18} /> : editTarget ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
