import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  InputAdornment,
} from '@mui/material'
import { Activity } from '@/types'
import { useAchievements } from '@/hooks/use-achievements'

interface CreateActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (activity: Partial<Activity>) => Promise<void>
}

const statusOptions: { value: Activity['status']; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
]

const priorityOptions: { value: Activity['priority']; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
]

export function CreateActivityDialog({ open, onOpenChange, onCreate }: CreateActivityDialogProps) {
  const { achievements } = useAchievements()
  const linkedAchievements = achievements.filter(
    (achievement) => ['linked_item', 'manual'].includes(achievement.mode ?? 'global_auto')
  )
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'backlog' as Activity['status'],
    priority: 'medium' as Activity['priority'],
    due_date: '' as string,
    xp_reward: 1,
    deadline_bonus_percent: 0,
    achievement_id: '' as string,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      await onCreate({
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        xp_reward: formData.xp_reward,
        deadline_bonus_percent: formData.deadline_bonus_percent,
        achievement_id: formData.achievement_id || null,
      })
      setFormData({
        name: '',
        description: '',
        status: 'backlog',
        priority: 'medium',
        due_date: '',
        xp_reward: 1,
        deadline_bonus_percent: 0,
        achievement_id: '',
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating activity:', error)
      alert(`Erro ao criar atividade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Nova Atividade</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Crie uma nova atividade para gerenciar no Kanban
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nome da Atividade *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Revisar documentação"
              required
              fullWidth
            />
            <TextField
              label="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Breve descrição da atividade"
              fullWidth
              multiline
            />
            <FormControl fullWidth>
              <InputLabel>Status Inicial</InputLabel>
              <Select
                value={formData.status}
                label="Status Inicial"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Activity['status'] })}
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Prioridade</InputLabel>
              <Select
                value={formData.priority}
                label="Prioridade"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Activity['priority'] })}
              >
                {priorityOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Data de Vencimento"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              {/* XP reward for this activity */}
              <TextField
                label="XP"
                type="number"
                value={formData.xp_reward}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    xp_reward: Math.max(0.01, Math.min(1000, Number(e.target.value))),
                  })
                }
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0.01, max: 1000, step: 0.01 }}
                sx={{ width: 100 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontSize: 11, color: 'secondary.main', fontWeight: 700 }}>+</Typography>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="% Bônus no Prazo"
                type="number"
                value={formData.deadline_bonus_percent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deadline_bonus_percent: Math.max(0, Math.min(500, Number(e.target.value))),
                  })
                }
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, max: 500, step: 0.01 }}
                sx={{ width: 180 }}
              />

              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel>Conquista Vinculada</InputLabel>
                <Select
                  value={formData.achievement_id}
                  label="Conquista Vinculada"
                  onChange={(e) => setFormData({ ...formData, achievement_id: String(e.target.value) })}
                >
                  <MenuItem value="">Nenhuma</MenuItem>
                  {linkedAchievements.map((achievement) => (
                    <MenuItem key={achievement.id} value={achievement.id}>
                      {achievement.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading || !formData.name.trim()}>
            {loading ? 'Criando...' : 'Criar Atividade'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
