# Storage: imagens de capa das atividades

As imagens de capa dos cards de atividade são armazenadas no **Supabase Storage**.

## Configuração

1. No **Supabase Dashboard**, vá em **Storage**.
2. Clique em **New bucket**.
3. Nome do bucket: `activity-covers`.
4. Marque **Public bucket** (para as imagens serem acessíveis via URL pública).
5. Crie o bucket.

### Política de upload (opcional)

Se usar RLS no Storage, permita que usuários autenticados façam upload e leitura:

- **INSERT**: `auth.role() = 'authenticated'`
- **SELECT**: `true` (público) ou `auth.role() = 'authenticated'`

Com bucket público, as URLs retornadas por `getPublicUrl()` funcionam para exibir as imagens nos cards.
