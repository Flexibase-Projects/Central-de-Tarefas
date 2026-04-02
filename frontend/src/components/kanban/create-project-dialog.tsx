import { useState } from 'react';
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
} from '@mui/material';
import { Project } from '@/types';
import { useProjectResponsibleUsers } from '@/hooks/use-project-responsible-users';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (project: Partial<Project>) => Promise<void>;
}

const statusOptions: { value: Project['status']; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

export function CreateProjectDialog({ open, onOpenChange, onCreate }: CreateProjectDialogProps) {
  const { users } = useProjectResponsibleUsers()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    github_url: '',
    project_url: '',
    responsible_user_id: '',
    status: 'backlog' as Project['status'],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      let github_owner: string | null = null;
      let github_repo: string | null = null;
      if (formData.github_url) {
        const match = formData.github_url.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (match) {
          github_owner = match[1];
          github_repo = match[2].replace(/\.git$/, '');
        }
      }

      await onCreate({
        name: formData.name,
        description: formData.description || null,
        github_url: formData.github_url || null,
        project_url: formData.project_url || null,
        responsible_user_id: formData.responsible_user_id || null,
        github_owner,
        github_repo,
        status: formData.status,
      });

      setFormData({ name: '', description: '', github_url: '', project_url: '', responsible_user_id: '', status: 'backlog' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert(`Erro ao criar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Novo Projeto</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nome do Projeto *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Sistema de Autenticação"
              required
              fullWidth
            />
            <TextField
              label="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Breve descrição do projeto"
              fullWidth
              multiline
            />
            <TextField
              label="URL do Repositório GitHub (opcional)"
              type="url"
              value={formData.github_url}
              onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
              placeholder="https://github.com/owner/repo — pode adicionar depois"
              fullWidth
            />
            <TextField
              label="Link do projeto (opcional)"
              type="url"
              value={formData.project_url}
              onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
              placeholder="https://app.exemplo.com"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="project-responsible-label">Responsável do Projeto</InputLabel>
              <Select
                labelId="project-responsible-label"
                value={formData.responsible_user_id}
                label="Responsável do Projeto"
                onChange={(e) => setFormData({ ...formData, responsible_user_id: String(e.target.value) })}
                inputProps={{ 'aria-label': 'Responsável do projeto' }}
              >
                <MenuItem value="">Sem responsável</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status Inicial</InputLabel>
              <Select
                value={formData.status}
                label="Status Inicial"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading || !formData.name.trim()}>
            {loading ? 'Criando...' : 'Criar Projeto'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
