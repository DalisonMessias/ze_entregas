# Base de Conhecimento - Aprendizado Contínuo

## [2026-04-25] ReferenceError no AdminLoanConfig.tsx

- **Erro**: `ReferenceError: MobileTabsSelect is not defined`.
- **Causa**: O componente `MobileTabsSelect` estava sendo utilizado no código JSX do componente `AdminLoanConfig`, mas não havia sido importado no topo do arquivo. Isso ocorria especificamente na renderização mobile das abas de configuração de empréstimos.
- **Solução**: Adicionada a importação explícita de `MobileTabsSelect` a partir do diretório de componentes: `import { MobileTabsSelect } from './MobileTabsSelect';`.
