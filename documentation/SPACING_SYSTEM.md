# Sistema de Espaçamento do Zé Entregas

Base: 8px

Hierarquia
- 8px: `p-2`, `m-2`, `space-y-2` — espaçamentos pequenos
- 16px: `p-4`, `m-4`, `gap-4` — blocos e ações rápidas
- 24px: `p-6`, `m-6` — modais e seções internas
- 32px: `p-8`, `m-8` — cartões principais e áreas destacadas

Ritmo Vertical e Horizontal
- Use `space-y-*` para listas/seções e `gap-*` em grids
- Mantenha `gap-4` em ações rápidas e `space-y-2` em itens de histórico
- Separe conteúdos e metadados com `mt-8` e `pt-6` após divisórias

Responsividade
- Container: `px-4 sm:px-8 md:px-16`
- Padding dos cartões: mantenha `p-8` para legibilidade em todas as telas
- Evite reduzir abaixo de 8px em telas pequenas

Proporções
- Priorize `p-8` em cartões principais e `p-6` em modais
- Conteúdo denso: use `space-y-2`; conteúdo amplo: `space-y-4`

Aplicação no Zebank
- Card de saldo: `p-8`, `mt-8`, `pt-6`
- Ações rápidas: `grid gap-4`
- Itens de histórico: `p-4`, `space-y-2`

