# SDD: Remocao do MUI do Frontend

## Status

- Data: 2026-04-02
- Estado: implementado e validado
- Escopo: `frontend/`
- Objetivo: retirar `@mui/material`, `@mui/icons-material`, `@emotion/react` e `@emotion/styled` do sistema em execucao, sem regressao estrutural no shell, nos modulos e nas rotas ja existentes

## Descoberta

### Baseline encontrado

- O frontend misturava componentes shadcn/Radix/Tailwind com importacoes diretas de MUI em dezenas de arquivos.
- A remocao imediata do MUI sem bridge quebraria shell, dialogs, tabelas, formularios, overlays e partes administrativas.
- O produto ja tinha iniciado a migracao de governanca por workspace/capabilities, entao a troca visual precisava preservar esse trabalho.

### Restricoes reais

- Preservar comportamento funcional atual.
- Nao espalhar novos acoplamentos.
- Manter build e lint utilizaveis durante a transicao.
- Nao reintroduzir dependencia de pacote MUI para a interface.

## Especificacao

### Decisao principal

Adotar uma bridge local temporaria em `frontend/src/compat/mui/` para manter a API usada hoje pela interface, enquanto o pacote MUI sai do sistema e o frontend passa a apontar diretamente para componentes locais.

### Decisoes complementares

1. Remover as dependencias MUI/Emotion do `frontend/package.json`.
2. Eliminar importacoes `@mui/*` de `frontend/src`.
3. Substituir essas importacoes por `@/compat/mui/material`, `@/compat/mui/styles` e `@/compat/mui/icons-material`.
4. Manter tipagem publica da bridge para nao degradar inferencia de eventos, `sx` e callbacks de `theme`.
5. Preservar `ThemeProvider` legado do projeto enquanto a base visual ainda esta em transicao.
6. Registrar a trilha em SDD para permitir a proxima fase: reduzir a bridge e convergir para primitives/shadcn reais.

## Implementacao realizada

### Pacotes removidos

- `@mui/material`
- `@mui/icons-material`
- `@emotion/react`
- `@emotion/styled`

### Camada local criada/ajustada

- `frontend/src/compat/mui/material.tsx`
- `frontend/src/compat/mui/styles.ts`
- `frontend/src/compat/mui/icons-material.tsx`
- `frontend/src/types/compat-mui-modules.d.ts`

### Mudancas estruturais

- Todo `frontend/src` deixou de importar `@mui/material`, `@mui/material/styles` e `@mui/icons-material`.
- A tipagem de `Theme`, `SxProps` e componentes de compatibilidade foi restaurada para o modulo local.
- O `vite.config.ts` deixou de depender de aliases para `@mui/*` porque o codigo da interface agora importa a bridge local diretamente.
- O arquivo temporario `frontend/src/types/mui-compat.d.ts` foi removido.

### Continuidades preservadas

- Shell e navegacao capability-driven introduzidos antes desta fase permanecem ativos.
- Rotas, guards e comportamento funcional de modulo continuam preservados.
- `components.json` continua presente como base para a migracao oficial por shadcn/ui.

## Validacao

### Inventario

- Importacoes `@mui/*` em `frontend/src`: `0`
- `npm ls --workspace frontend @mui/material @mui/icons-material @emotion/react @emotion/styled`: vazio

### Comandos executados

```bash
npm uninstall --workspace frontend @emotion/react @emotion/styled @mui/icons-material @mui/material
npm run build
npm run lint
npm ls --workspace frontend @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### Resultado

- `npm run build`: ok
- `npm run lint`: ok com 24 warnings preexistentes do repositorio
- `npm ls`: sem pacotes MUI/Emotion no workspace `frontend`

### Observacoes de performance

- O build ainda reporta chunks acima de 500 kB.
- A remocao do pacote MUI limpa dependencia e acoplamento sem resolver sozinha o problema de code-splitting do shell.

## Riscos conhecidos

1. A bridge local ainda e um adaptador de compatibilidade, nao a arquitetura final de UI.
2. O nome `compat/mui` deixa explicito que se trata de uma camada transitoria; ela deve encolher ao longo das proximas ondas.
3. O `ThemeProvider` do projeto ainda e parte relevante da base visual e precisa ser convergido para tokens/shadcn em fase posterior.
4. Alguns warnings de lint continuam no repositorio e nao foram introduzidos por esta fase.

## Proxima fase recomendada

1. Migrar o shell principal e os wrappers de superficie para primitives do design system, reduzindo gradualmente a bridge.
2. Atacar code-splitting do shell e dos modulos mais pesados.
3. Substituir componentes de compatibilidade por `components/ui` e wrappers minimos alinhados ao shadcn.
4. Eliminar a necessidade de `compat/mui` por grupos de tela, nao por refactor global.

## Definicao de pronto desta fase

- O frontend nao depende mais dos pacotes MUI/Emotion.
- O codigo da interface nao importa mais `@mui/*`.
- Build e lint permanecem executaveis.
- O racional da troca e as pendencias ficaram documentados em SDD.
