# Base de Conhecimento - Aprendizado Contínuo

## [2026-04-25] ReferenceError no AdminLoanConfig.tsx

- **Erro**: `ReferenceError: MobileTabsSelect is not defined`.
- **Causa**: O componente `MobileTabsSelect` estava sendo utilizado no código JSX do componente `AdminLoanConfig`, mas não havia sido importado no topo do arquivo. Isso ocorria especificamente na renderização mobile das abas de configuração de empréstimos.
- **Solução**: Adicionada a importação explícita de `MobileTabsSelect` a partir do diretório de componentes: `import { MobileTabsSelect } from './MobileTabsSelect';`.

## [2026-04-25] Redesign de UI Complexa e Substituições de Código

- **Desafio**: Realizar o redesign de múltiplos blocos de UI em um arquivo grande (MerchantPOSDesktop.tsx) onde ferramentas de substituição por string exata falhavam devido a inconsistências de espaços e identação.
- **Solução**: Utilização de um script Python customizado para ler o conteúdo do arquivo, realizar a substituição de blocos multilinhas usando strings literais e reescrever o arquivo com a codificação correta (UTF-8).
- **Aprendizado**: Para modificações estruturais extensas em UIs complexas, scripts especializados são mais resilientes do que substituições atômicas via ferramentas de diff/patch quando o ambiente possui variações de whitespace.

## [2026-05-29] Erro de Compilação do TypeScript no StoreStatus.tsx (manual_override_until em PartnerProfile)

- **Erro**: `Property 'manual_override_until' does not exist on type 'PartnerProfile'. Did you mean 'manual_override'?` nas linhas do componente `StoreStatus.tsx`.
- **Causa**: O componente `StoreStatus.tsx` foi atualizado para gerenciar e exibir a expiração temporária de abertura e fechamento manual das lojas através da coluna `manual_override_until`. No entanto, essa propriedade não estava presente na definição da interface `PartnerProfile` no arquivo unificado de tipos do frontend (`types.ts`).
- **Solução**: Adicionada a propriedade opcional `manual_override_until?: string | null;` na interface `PartnerProfile` em `types.ts`, logo após o campo `manual_override`. Isso permitiu ao compilador do TypeScript compreender e aceitar a presença deste dado no perfil da loja vindo do banco de dados Supabase, eliminando o erro de build.

## [2026-05-29] Erro de Compilação no App.tsx (Ícone Laptop ausente no import)

- **Erro**: `Cannot find name 'Laptop'.` na linha do componente `App.tsx` onde a aba de download foi reinserida.
- **Causa**: O ícone `Laptop` do `lucide-react` foi adicionado no item de menu móvel das lojas, mas não estava listado nas importações no topo do arquivo `App.tsx`.
- **Solução**: Adicionada a importação explícita de `Laptop` a partir da biblioteca `lucide-react` no import do cabeçalho de `components/App.tsx`, sanando o erro de escopo de nome e normalizando o build.

## [2026-05-29] Erro de Tipagem do TypeScript no AuthWrapper.tsx (currentTab !== 'store_gestor')

- **Erro**: `This comparison appears to be unintentional because the types '"admin_dashboard" | ... | "not_found"' and '"store_gestor"' have no overlap.`
- **Causa**: A propriedade `currentTab` é tipada estritamente com base nos valores da união `ActiveTab`. Como `'store_gestor'` não estava explicitamente sobreposta nas chaves mapeadas no arquivo de tipagem do frontend naquele escopo, a comparação de diferença estrita acusava um erro de falta de sobreposição no TypeScript.
- **Solução**: Coagida a propriedade `currentTab` para string (`String(currentTab) !== 'store_gestor'`) no momento da verificação, fazendo com que a comutação seja aceita perfeitamente pelo compilador global.

## [2026-05-30] Atualização Automática de Página (Reset de Estado) ao Alternar Abas ou Janelas no Navegador

- **Erro**: Ao perder o foco do navegador, minimizar, ir para outro programa ou alternar de aba, o painel do gestor de loja `/loja/gestor` e outras páginas de usuário sofriam um reset completo (com exibição rápida de tela de loading ou remontagem dos componentes), reiniciando o estado local (filtros de pedidos, detalhes ativos, etc.) e parecendo uma atualização involuntária completa.
- **Causa**: O Supabase JS dispara automaticamente o evento `TOKEN_REFRESHED` no `onAuthStateChange` após retomar a execução em abas inativas para re-validar a sessão. Tanto o `AuthWrapper.tsx` quanto o `StoreGestor.tsx` escutavam este evento global sem filtrar se o usuário já estava autenticado e ativo. Com isso, re-carregavam o perfil, alteravam estados de sessão e disparavam eventos de navegação redundantes, forçando a remontagem dos componentes estruturais da rota.
- **Solução**:
  1. Criadas referências de ID de usuário ativas (`useRef` sincronizadas com efeitos de estado) em `AuthWrapper.tsx` e `StoreGestor.tsx` para persistir o ID síncrono da sessão atual.
  2. Adicionado um escape antecipado (early return) no callback `onAuthStateChange` de `AuthWrapper.tsx` para ignorar o evento `TOKEN_REFRESHED` se o ID do usuário da nova sessão for idêntico ao já ativo (`userIdRef.current`).
  3. Adicionado o mesmo escape antecipado em `StoreGestor.tsx` para impedir que o loading de inicialização (`initialLoading`) seja definido como verdadeiro ao receber o evento de atualização de token da mesma sessão.

## [2026-05-30] WhatsBot Sem Responder (Silêncio Total) na Conexão do WhatsApp

- **Erro**: O WhatsBot conectava via QR Code com sucesso na rota `/loja/whatsbot`, mas o robô não respondia a nenhuma mensagem enviada ao número do WhatsApp associado, ficando totalmente silencioso (mudo).
- **Causa**: 
  1. A consulta da chave de API do Gemini no banco de dados na tabela `api_keys` estava mapeada de forma totalmente errônea. Estava selecionando `.select('key_value')` e filtrando por `.eq('provider', 'google_gemini')`. No entanto, a estrutura correta da tabela `api_keys` utiliza a coluna `key_token` (ou `key_value` de fallback) e o identificador de serviço é `service_name` (não `provider`). Como resultado, a consulta falhava retornando `null` silenciosamente.
  2. Falha de assinatura na chamada do serviço de inteligência artificial: o `aiService.processMessage` espera receber no 4º argumento um objeto `{ gemini?: string; groq?: string }` e no 5º o `primaryProvider`. O código em `whatsBotService.ts` passava a chave diretamente como string no 4º argumento, o que gerava incompatibilidade de assinatura e não dava suporte ao provedor Groq.
  3. Lógica de controle do WhatsBot incompleta: se a IA estivesse ativada, mas as chaves estivessem ausentes ou se ocorresse algum erro no bloco `try`, o bot entrava em um bloco silencioso, efetuando um `return` ou enviando um aviso inútil sem disparar nenhum fallback de catálogo, deixando o cliente completamente sem resposta.
- **Solução**:
  1. Corrigida a consulta de chaves de API para buscar adequadamente os campos `service_name` = `'google_gemini'` / `'groq'` e coletar o `key_token` / `key_value` no servidor.
  2. Implementada uma consulta inteligente e robusta em cascata para Gemini, Groq e o provedor preferencial (`ai_primary_provider`), com suporte a isolamento por loja (`store_id = this.storeId`) e fallback global de administrador (`store_id is null`), além de buscar em variáveis de ambiente (`process.env`).
  3. Ajustada a assinatura de chamada de `processMessage` com suporte unificado e transparente a Google Gemini e Groq no servidor.
  4. Implementado um redirecionamento de fallback automático e blindado no bloco `catch` do servidor: se a IA falhar de qualquer modo (chaves ausentes ou problemas com o Gemini/Groq), o robô assume e dispara a mensagem padrão da loja com o link do catálogo. Isso garante que o bot nunca fique mudo e responde com o catálogo da loja imediatamente, mantendo o controle de limite diário e memória RAM anti-spam (`reserveDailySend` e `aiFallbackCache`) ativos.
  5. Ajustada a lógica de reescrita/harmonização de mensagens `handleHarmonizeMessage` no frontend ([WhatsBot.tsx](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/components/WhatsBot.tsx)): adicionado suporte unificado e síncrono a Google Gemini e Groq, eliminando a barreira de validação restritiva do Gemini e chamando via `fetch` a API do Groq caso seja o provedor preferencial configurado no painel da loja.

## [2026-05-30] Ignorância da Configuração de IA Principal (Preferencial) do Admin no WhatsBot e Zé Assistente

- **Erro**: O WhatsBot e o Zé Assistente utilizavam o provedor Google Gemini mesmo quando o administrador definia globalmente no painel de controle que o provedor principal era o Groq.
- **Causa**:
  1. A lógica de busca em cascata em `whatsBotService.ts` consultava a tabela `api_keys` com o filtro de `store_id = this.storeId`. Se a loja não possuísse uma linha individual para `ai_primary_provider`, o retorno da consulta era nulo, o que atribuía `'google_gemini'` (fallback imediato) à variável local `primaryProvider`. Com isso, a condição posterior `if (primaryProvider !== 'google_gemini' && primaryProvider !== 'groq')` falhava por não ser diferente de `'google_gemini'`, pulando por completo a consulta ao registro global do administrador (`store_id is null`).
  2. No `zeAssistantService.ts`, o método privado `getPrimaryAIProvider()` não aceitava nem recebia o `storeId` da loja no payload da mensagem, impossibilitando que a lógica de cascata consultasse as preferências individuais das lojas, operando apenas em contexto estritamente global sem parâmetros de isolamento.
- **Solução**:
  1. Corrigida a lógica de busca de provedor em `whatsBotService.ts` removendo a atribuição imediata do fallback padrão `'google_gemini'` na consulta individual, mantendo o valor como `undefined` caso a loja não possua configuração individual. Desta forma, a cascata flui perfeitamente, executando a busca global de administrador.
  2. Atualizado o método `getPrimaryAIProvider(storeId?: string)` em `zeAssistantService.ts` para receber o identificador da loja e passá-lo para a chamada `cloud.getAPIKey('ai_primary_provider', storeId)`.
  3. Atualizadas as chamadas a `getPrimaryAIProvider(payload.storeId)` em `zeAssistantService.ts` nas ramificações de loja fechada e aberta.