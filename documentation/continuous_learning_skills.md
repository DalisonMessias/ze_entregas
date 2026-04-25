# Base de Conhecimento - Aprendizado Contínuo

## [2026-04-25] ReferenceError no AdminLoanConfig.tsx

- **Erro**: `ReferenceError: MobileTabsSelect is not defined`.
- **Causa**: O componente `MobileTabsSelect` estava sendo utilizado no código JSX do componente `AdminLoanConfig`, mas não havia sido importado no topo do arquivo. Isso ocorria especificamente na renderização mobile das abas de configuração de empréstimos.
- **Solução**: Adicionada a importação explícita de `MobileTabsSelect` a partir do diretório de componentes: `import { MobileTabsSelect } from './MobileTabsSelect';`.

## [2026-04-25] Redesign de UI Complexa e Substituições de Código

- **Desafio**: Realizar o redesign de múltiplos blocos de UI em um arquivo grande (MerchantPOSDesktop.tsx) onde ferramentas de substituição por string exata falhavam devido a inconsistências de espaços e identação.
- **Solução**: Utilização de um script Python customizado para ler o conteúdo do arquivo, realizar a substituição de blocos multilinhas usando strings literais e reescrever o arquivo com a codificação correta (UTF-8).
- **Aprendizado**: Para modificações estruturais extensas em UIs complexas, scripts especializados são mais resilientes do que substituições atômicas via ferramentas de diff/patch quando o ambiente possui variações de whitespace.