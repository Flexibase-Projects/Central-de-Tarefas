import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Buscar usuário por email — não enviar userId para o backend tratar como login e permitir listar usuários
      const requestUrl = `${API_URL}/api/users?userId=`;
      const response = await fetch(requestUrl, {
        headers: {
          'x-user-id': 'temp',
        },
      });

      if (!response.ok) {
        const bodyText = await response.text();
        let errorMessage = 'Erro ao buscar usuários';
        try {
          const body = JSON.parse(bodyText);
          if (body?.error && typeof body.error === 'string') errorMessage = body.error;
        } catch (_) {}
        throw new Error(errorMessage);
      }

      const users = await response.json();
      const user = users.find((u: any) => u.email === email);

      if (!user) {
        setError('Usuário não encontrado');
        setLoading(false);
        return;
      }

      // Por enquanto, aceitar qualquer senha (será substituído por autenticação real)
      // Para o usuário admin/admin, aceitar senha "admin"
      if (email === 'admin@cdt.com' && password !== 'admin') {
        setError('Senha incorreta');
        setLoading(false);
        return;
      }

      if (!user.is_active) {
        setError('Usuário inativo');
        setLoading(false);
        return;
      }

      // Fazer login
      await login(user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md space-y-8 bg-background p-8 rounded-lg border shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">CDT Inteligência</h1>
          <p className="text-muted-foreground mt-2">Central de Tarefas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cdt.com"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <p>Usuário padrão: admin@cdt.com / admin</p>
        </div>
      </div>
    </div>
  );
}
