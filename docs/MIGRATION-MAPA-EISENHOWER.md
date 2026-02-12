# Migração: Mapa Eisenhower (posição global + tempo real)

Para que as posições dos cards no Mapa fiquem **gravadas no banco** e **visíveis em tempo real** para todos (qualquer navegador, sem depender de cache), execute **uma única vez** o script abaixo no **Supabase** (SQL Editor do seu projeto).

## Passo 1: Abrir o SQL Editor

No [Supabase Dashboard](https://supabase.com/dashboard), abra o projeto → **SQL Editor** → **New query**.

## Passo 2: Colar e executar o script

Cole o bloco abaixo e clique em **Run**.

```sql
-- Colunas para posição no mapa Eisenhower (global para todos)
ALTER TABLE cdt_projects ADD COLUMN IF NOT EXISTS map_quadrant SMALLINT NULL;
ALTER TABLE cdt_projects ADD COLUMN IF NOT EXISTS map_x NUMERIC(5,2) NULL;
ALTER TABLE cdt_projects ADD COLUMN IF NOT EXISTS map_y NUMERIC(5,2) NULL;

-- Habilitar Realtime na tabela (atualização em tempo real entre navegadores)
ALTER PUBLICATION supabase_realtime ADD TABLE cdt_projects;
```

Se aparecer erro dizendo que a tabela já está na publicação (e.g. "already member"), ignore apenas essa linha; as colunas já terão sido criadas.

## Resultado

- As posições dos cards passam a ser **salvas no banco** (`map_quadrant`, `map_x`, `map_y`).
- Qualquer pessoa, em qualquer navegador, vê as **mesmas posições** (fonte única: banco).
- Quando alguém move um card, as **outras abas/navegadores atualizam em tempo real** (Supabase Realtime).

## Variante: tabela se chama `projects` (sem prefixo)

Se a sua tabela de projetos for `projects` e não `cdt_projects`, use:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS map_quadrant SMALLINT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS map_x NUMERIC(5,2) NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS map_y NUMERIC(5,2) NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
```

E no código, a aplicação precisa apontar para a tabela `projects` (o backend atual usa `cdt_projects`).
