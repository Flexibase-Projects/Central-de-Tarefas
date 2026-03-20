import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, ArrowLeft, Info, Moon, Sun } from 'lucide-react';
import { Box, Typography, TextField, Button, Alert, Fade, CircularProgress, IconButton, Tooltip, useTheme } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/theme/ThemeProvider';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSobre, setShowSobre] = useState(false);
  const { login } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const theme = useTheme();
  const isLight = mode === 'light';

  const canSubmit = Boolean(email.trim() && password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loginForm = (
    <Fade in timeout={280}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <Typography variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 3, letterSpacing: '-0.02em' }}>
          Central de Tarefas
        </Typography>

        <Typography variant="h4" fontWeight={700} textAlign="center" sx={{ mb: 0.5, letterSpacing: '-0.015em' }}>
          Bem-vindo(a)
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3.5 }}>
          Acesse sua conta para continuar
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            disabled={loading}
            autoComplete="email"
            fullWidth
            size="medium"
          />
          <TextField
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            autoComplete="current-password"
            fullWidth
            size="medium"
          />

          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 1.5 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !canSubmit}
            fullWidth
            sx={{ mt: 0.5, height: 44 }}
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : canSubmit ? (
                <Unlock size={18} strokeWidth={2} />
              ) : (
                <Lock size={18} strokeWidth={2} />
              )
            }
          >
            {loading ? 'Entrando...' : 'Acessar sistema'}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="text"
            size="small"
            startIcon={<Info size={15} />}
            onClick={() => setShowSobre(true)}
            sx={{ color: 'text.secondary', fontSize: 13 }}
          >
            O que é este sistema?
          </Button>
        </Box>
      </Box>
    </Fade>
  );

  const sobreScreen = (
    <Fade in timeout={280}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 400 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowLeft size={16} />}
          onClick={() => setShowSobre(false)}
          sx={{ alignSelf: 'flex-start', mb: 3 }}
        >
          Voltar ao login
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1.5 }}>
          Central de Tarefas
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Sistema gamificado de gestão de tarefas e projetos desenvolvido
          para o time de Desenvolvimento de Sistemas. Acompanhe progresso,
          conquistas e indicadores em tempo real.
        </Typography>
      </Box>
    </Fade>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        position: 'relative',
        bgcolor: 'background.default',
      }}
    >
      {/* Painel esquerdo — branding (apenas desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '42%',
          flexShrink: 0,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: isLight
            ? 'linear-gradient(145deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)'
            : 'linear-gradient(145deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Padrão decorativo sutil */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06) 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%)`,
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ color: 'white', mb: 1.5, letterSpacing: '-0.015em' }}
          >
            Central de Tarefas
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.72)', maxWidth: 280, mx: 'auto', lineHeight: 1.65 }}
          >
            Gestão de projetos e atividades com gamificação para times de desenvolvimento.
          </Typography>

          {/* Chips decorativos */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 4 }}>
            {['Projetos', 'Kanban', 'Indicadores', 'Conquistas'].map((label) => (
              <Box
                key={label}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.2)',
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {label}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Painel direito — formulário */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 5 },
          position: 'relative',
        }}
      >
        {/* Toggle de tema */}
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <Tooltip title={isLight ? 'Modo escuro' : 'Modo claro'}>
            <IconButton
              onClick={toggleTheme}
              size="small"
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                color: 'text.secondary',
                '&:hover': { color: 'primary.main', borderColor: 'primary.main' },
              }}
            >
              {isLight ? <Moon size={15} /> : <Sun size={15} />}
            </IconButton>
          </Tooltip>
        </Box>

        {showSobre ? sobreScreen : loginForm}
      </Box>
    </Box>
  );
}
