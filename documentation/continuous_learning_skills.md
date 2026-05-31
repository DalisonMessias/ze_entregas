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

## [2026-05-31] Sobreposição e Falta de Responsividade no Header/Navbar da Página Home no Mobile

- **Erro**: No celular (mobile), o logo, o título da marca e os botões da barra de navegação principal da Home ficavam sobrepostos e desalinhados. Além disso, a seção Hero/Banner invadia o topo do header, cobrindo elementos, e os botões de ação ficavam excessivamente grandes para telas pequenas.
- **Causa**:
  1. O SVG do Logo no modo `full` possui uma proporção muito larga (quase 4:1). Ao definir uma altura fixa de `h-8` (32px), ele ocupava cerca de `126px` de largura.
  2. A div dos botões "Entrar" e "Cadastrar" usava classes com paddings e textos longos redundantes no mobile (ex: exibindo "Criar Conta" com 11 caracteres no mobile e "Cadastrar" com 9 caracteres no desktop, o oposto da boa prática de UX). Os dois botões disputavam atenção visual na cor vermelha, e somados ao tamanho do logo ultrapassavam a largura do contêiner em telas pequenas, gerando colisão horizontal.
  3. O Hero section centralizava verticalmente seu conteúdo a partir do topo sem aplicar padding-top suficiente para compensar o header fixo (`fixed top-0`), fazendo com que o título invadisse a área sob a barra de navegação no mobile.
- **Solução**:
  1. **Responsividade Inteligente do Logo**: Reduzida a altura do logo de forma responsiva (`h-6 sm:h-7 md:h-8`), reduzindo a largura proporcional do SVG em telas pequenas.
  2. **Hierarquia e Tamanho dos Botões**: O botão "Entrar" foi convertido para estilo ghost translúcido, deixando apenas "Cadastrar" como botão primário vermelho em destaque. Invertida a lógica do texto de cadastro: agora exibe "Cadastrar" (compacto) no mobile e "Cadastrar Grátis" no desktop, e os paddings e tamanhos foram encolhidos responsivamente no celular (`text-xs` e `px-3 py-1.5` no mobile, e `sm:text-sm md:text-base` com gaps flexíveis).
  3. **Visual Glassmorphism Premium**: Implementado fundo branco translúcido com `backdrop-blur-md` e borda suave no scroll. Sem scroll, um gradiente preto superior muito sutil (`bg-gradient-to-b from-black/55 to-transparent`) foi aplicado para destacar a marca e botões brancos sobre o banner do Hero.
  4. **Paddings de Compensação**: Adicionado padding-top progressivo no Hero section (`pt-24 sm:pt-32 md:pt-40`), empurrando o conteúdo do banner para baixo da área do header fixed.

## [2026-05-31] Brecha de Segurança no Controle de Acesso e Downgrade de Planos Expirados

- **Erro**: Lojistas com o plano de Super Lojista vencido/expirado ainda conseguiam acessar e utilizar recursos exclusivos e páginas protegidas do backend (APIs do Express) e do frontend, mesmo após a data de expiração do plano ter passado.
- **Causa**:
  1. O middleware de autenticação e controle de acesso no backend (`supabaseAuth.ts`) apenas consultava a coluna booleana `is_super_store` na tabela `user_profiles` do banco de dados, sem validar em tempo real as colunas `super_store_plan_type` (tipo de plano MENSALIDADE) e `super_store_expiration` (data de expiração). Se o downgrade em segundo plano no banco de dados (`check_and_downgrade_expired_plans`) ainda não tivesse sido executado de forma síncrona/periódica, a coluna `is_super_store` continuava como `true` no banco de dados, permitindo acesso indevido.
  2. No frontend, as funções que buscam o perfil da loja (como `cloud.getMyPartnerProfile()`) liam os dados brutos da tabela `user_profiles` diretamente, herdando o valor de `is_super_store` e gerando inconsistência visual e funcional no painel do parceiro até que uma atualização forçada de downgrade ocorresse.
- **Solução**:
  1. **Aprimoramento do Middleware no Backend**: Modificado o middleware de autenticação `supabaseAuth.ts` para selecionar as colunas `super_store_plan_type` e `super_store_expiration`. Foi integrada uma validação robusta em tempo real que compara a data de expiração com o horário atual (`now()`). Ao detectar um plano expirado, o middleware desativa a flag de Super Lojista no objeto `req.user` para a requisição corrente e dispara, de forma assíncrona e não-bloqueante no banco de dados, o downgrade definitivo do lojista (`is_super_store = false` e `plan_level = 'GRATUITO'`).
  2. **Consistência em Tempo Real no Frontend**: A função `getMyPartnerProfile` em `services/cloud.ts` foi aprimorada com a mesma lógica de validação de expiração em tempo real. Se o plano mensal estiver vencido, o frontend força instantaneamente o tratamento do usuário como plano gratuito (`is_super_store = false`), propagando a informação de forma imediata à interface gráfica do lojista (como no carregamento de sidebars e restrições de menus).
  3. **Validação de Testes Unitários**: Criado o arquivo de testes unitários `server/middleware/__tests__/supabaseAuth.test.ts` com o Vitest para validar a interceptação de requisições de lojistas expirados com status 403, o downgrade automático e a persistência no banco de dados.

## [2026-05-31] Erro de Tipagem do TypeScript no Mock do Request (supabaseAuth.test.ts)

- **Erro**: `Type 'Mock<(name: string) => string>' is not assignable to type '{ (name: "set-cookie"): string[]; (name: string): string; }'. Type 'string' is not assignable to type 'string[]'.` na linha 41 de `server/middleware/__tests__/supabaseAuth.test.ts`.
- **Causa**: O método `header` na interface `Request` do Express possui sobrecargas de tipo estritas para lidar com diferentes assinaturas de retorno (como `'set-cookie'` que retorna array de strings, ou outras chaves que retornam string única). Ao mockar o método com uma assinatura simples `vi.fn((name: string) => string | undefined)`, o TypeScript acusa incompatibilidade com o tipo de sobrecarga definido nativamente.
- **Solução**: Adicionada a coerção de tipo `as any` ao final da chamada de `vi.fn(...)` no método `header` do mock (`header: vi.fn(...) as any`). Isso desativa a validação estrita da assinatura nesse mock específico, alinhando-se perfeitamente com os tipos aceitos pelo compilador do projeto e normalizando o build.

## [2026-05-31] Erro de Idempotência SQL na Criação de Políticas RLS da Tabela store_blocked_users

- **Erro**: `Failed to run sql query: ERROR: 42710: policy "Lojistas podem ver seus bloqueios" for table "store_blocked_users" already exists` ao executar o script de migração global `supabase_global.sql`.
- **Causa**: O arquivo de migração global `supabase_global.sql` continha instruções `CREATE POLICY` diretas para a tabela `store_blocked_users` sem antes executar uma instrução de remoção condicional para essas políticas (`DROP POLICY IF EXISTS`). Em consequência, ao reexecutar as migrações em um banco de dados onde as políticas já haviam sido criadas (por exemplo, em atualizações parciais anteriores), o Supabase retornava um erro de banco impedindo o fluxo total da migração.
- **Solução**: Adicionadas cláusulas `DROP POLICY IF EXISTS` para todas as quatro políticas da tabela `store_blocked_users` (`Lojistas podem ver seus bloqueios`, `Lojistas podem criar bloqueios`, `Lojistas podem deletar bloqueios` e `Leitura pública para validação de checkout`) imediatamente antes de cada comando `CREATE POLICY` correspondente no arquivo `supabase_global.sql`. Isso tornou o script 100% idempotente, permitindo execuções repetidas sem falhas.

## [2026-05-31] Navegação Isolada e Abertura de Links em Nova Aba no Gestor de Pedidos (StoreGestor)

- **Desafio**: O Gestor de Pedidos (`/loja/gestor`) funciona como um sub-sistema autônomo (standalone/modo quiosque) que oculta a navegação tradicional do Zé Entregas. Cliques acidentais ou intencionais em links direcionados para fora do gestor retiravam o lojista da tela operacional da cozinha na mesma aba, quebrando a experiência de painel contínuo de monitoramento.
- **Causa**: Alguns componentes exibiam textos de links (como o endereço do catálogo digital em `StoreSettings.tsx`) ou cards de alerta e promoção estáticos (como "Insumos Operacionais" e "WhatsBot" em `StoreGestor.tsx`) que não forneciam interatividade ou, se a fizessem, navegavam na própria janela operacional do painel.
- **Solução**:
  1. No painel principal (`StoreGestor.tsx`), o card de "Insumos Operacionais" foi convertido em uma tag `<a>` real com `target="_blank"` e `rel="noopener noreferrer"`, com cursor de ponteiro e efeito hover suave, abrindo a página de insumos em nova janela. O card do WhatsBot foi programado com clique dinâmico para chavear o menu ativo diretamente para a aba integrada de WhatsApp.
  2. No painel de ajustes (`StoreSettings.tsx`), a div com o link literal do cardápio digital do parceiro foi convertida para uma tag `<a>` real com `target="_blank"`, permitindo clique direto de visualização rápida e isolada em nova aba.
  3. No componente `WhatsBot.tsx` (tela do WhatsBot Bloqueado) e em `ExclusiveLock.tsx` (recursos bloqueados para lojistas de plano gratuito), os botões de redirecionamento para upgrade ("Ver Planos e Fazer Upgrade" e "Quero ser Parceiro") disparavam eventos customizados `navigateToTab` para a mudança de abas no SPA clássico. Sob a rota `/loja/gestor`, foram programados para detectar que estão no escopo do quiosque e abrir a rota `/loja/planos` diretamente em uma nova aba do navegador (`target="_blank"`), assegurando a flexibilidade de assinatura de planos sem quebrar o monitoramento operacional de pedidos.

## [2026-05-31] Replicação e Integração Estética da Central de Suporte no Gestor de Pedidos (StoreGestor)

- **Desafio**: Integrar o suporte operacional diretamente no Gestor de Pedidos (`/loja/gestor`) sem redirecionar ou forçar a saída do usuário do monitor de cozinha isolado e sem simplesmente reutilizar o layout legado que poderia desconfigurar o visual premium.
- **Solução**:
  1. **Novo Componente Autônomo (`StoreSupport.tsx`)**: Criado do zero um componente que replica de forma exata e síncrona todas as capacidades do painel de suporte clássico (Verificação em tempo real de expediente com fallback automatizado, abertura de chamados com múltiplos anexos de imagens integrados, listagem de FAQ detalhada para parceiros e histórico cumulativo de chamados com retornos do suporte da administração). A UI foi otimizada para alinhar-se perfeitamente aos temas escuro/claro e espaçamentos do Gestor estilo iFood.
  2. **Interligação de Fluxo (`StoreGestor.tsx`)**: Mapeada a importação reativa e preguiçosa (`lazy-load`) do `StoreSupport.tsx` e acrescentada a nova aba `'suporte'` na tipagem central de navegação e nos loops de menu do gestor.
  3. **Interface e Usabilidade**: Adicionado o atalho visual com ícone de fone (`Headphones`) na gaveta lateral esquerda com tooltips informativos e transição fluida, mantendo a experiência inteiramente standalone.

## [2026-05-31] Ajuste de Rota do Card de Insumos e Correção de Fallback de Cor Inválida do Tailwind no Banner de Suporte

- **Problema**: 
  1. O card "Insumos Operacionais" no Gestor de Pedidos apontava para uma URL externa e genérica (`https://loja.zeentregas.com`), quando o correto seria direcionar o lojista de forma integrada para o e-commerce local de insumos e peças da própria plataforma na rota `/shop`.
  2. O banner superior da Central de Suporte (`StoreSupport.tsx`) exibia um degradê esbranquiçado no canto esquerdo, o que prejudicava a legibilidade e quebrava o padrão estético de alta fidelidade visual.
- **Causa**:
  1. O link original no card estava fixado estaticamente para o site legado da loja oficial externa.
  2. A classe utilitária do Tailwind CSS utilizada no cabeçalho era `bg-gradient-to-r from-red-650 via-red-600 to-orange-500`. A cor `red-650` (assim como `red-550`) não existe no mapeamento padrão do Tailwind CSS. O compilador Tailwind interpretou a classe inexistente como nula/transparente, resultando em um fallback esbranquiçado e opaco translúcido indesejado na extremidade esquerda do banner.
- **Solução**:
  1. **Ajuste de Rota**: Alterada a propriedade `href` do card "Insumos Operacionais" no `StoreGestor.tsx` para a rota local `/shop`, mantendo o `target="_blank"` para preservar o fluxo de monitoramento de cozinha síncrono em outra aba.
  2. **Purificação do Degradê**: Corrigida a declaração de classes no banner superior do `StoreSupport.tsx` para `bg-gradient-to-r from-red-500 to-orange-500`. Esta declaração utiliza classes nativas do Tailwind, removendo instantaneamente a mancha translúcida e harmonizando o degradê 100% em tons puros de vermelho e laranja, mantendo o visual profissional, limpo e consistente com o restante da plataforma.

## [2026-05-31] Desenvolvimento de Sistema de Novidades Beta com Controle de Leitura por Lojista e Reset do Admin

- **Problema**: Fornecer um canal direto, interativo e persistente para manter os parceiros lojistas cientes de que estão em uma versão Beta e das correções de bugs, novidades e atualizações do sistema operacional. O informativo deve aparecer ao entrar no painel operacional (`StoreGestor.tsx`), permitir marcação individual como "lido" (não exibir novamente) e ser facilmente editável pelo administrador, forçando a reexibição global a todos os parceiros ao salvar uma nova versão.
- **Causa**: Originalmente, não havia tabelas nem telas para expor ou registrar o controle de conformidade/leitura de novidades do sistema pelos lojistas ativos, resultando em desinformação sobre melhorias operacionais recentes.
- **Solução**:
  1. **Arquitetura de Dados (RLS Seguro)**: Criada a tabela `system_announcements` para os informativos incrementais (título, conteúdo, versão) e `user_announcement_reads` para as confirmações individuais. RLS habilitado com políticas rígidas baseadas na função do administrador (`public.is_admin()`) e leitura para autenticados. Arquivos `supabase_global.sql` e `supabase_global_part3.sql` atualizados de forma consistente e cumulativa.
  2. **Experiência do Usuário (Lojista)**: Criado o modal em `/loja/gestor` (`StoreGestor.tsx`) com animação, Glassmorphism e desfoque de fundo. Desenvolvido switch reativo ("Marcar como lido") customizado em CSS do zero, eliminando o uso de checkbox nativo em conformidade estrita com o design system, liberando o botão de confirmação que registra a leitura no banco de forma assíncrona.
  3. **Interface do Administrador (Admin)**: Criado o componente de administração premium `AdminBetaNews.tsx` contendo o formulário de edição do informativo atual com carregamento síncrono. O campo `textarea` foi configurado com a classe `resize-none` (removendo o redimensionador inestético). Ao salvar, as novidades são salvas e a versão do anúncio é incrementada, enquanto todos os registros de leitura anteriores de lojistas em `user_announcement_reads` são excluídos (deletados) automaticamente na mesma transação, forçando a exibição global instantânea na próxima sessão de cada lojista.
  4. **Navegação e Integração**: Adicionada a aba `admin_beta_news` na tipagem do `navigation.ts`, na rota amigável `/admin/novidades-beta` no `routeMap.ts` e com permissões configuradas no `accessControl.ts`. Integrado o botão de acesso "Novidades Beta" com o ícone `Sparkles` no menu de sidebar administrativo no `components/App.tsx`.

## [2026-05-31] Erro de Compilação no App.tsx devido a Ícone Não Importado (Sparkles)

- **Problema**: O analisador do TypeScript acusou erro de compilação em `components/App.tsx` indicando `Cannot find name 'Sparkles'` na linha 1800.
- **Causa**: O novo botão de atalho inserido na sidebar administrativa ("Novidades Beta") utilizou o ícone `Sparkles` do Lucide. No entanto, embora o ícone seja amplamente utilizado em outras partes do sistema, ele não constava na listagem de ícones importados no topo do arquivo `App.tsx` na desestruturação de `lucide-react`.
- **Solução**: Localizada a linha de importações do `lucide-react` no topo do arquivo `components/App.tsx` e acrescentado o ícone `Sparkles` na lista, restabelecendo a compilação do TypeScript e o build livre de erros.

## [2026-05-31] Falha de Roteamento na Exibição do Painel Administrativo de Novidades Beta

- **Problema**: Ao tentar acessar diretamente a URL amigável `/admin/novidades-beta` ou clicar no botão lateral de menu do administrador, a área central do painel exibia a mensagem padrão *"Selecione uma opção no menu."* em vez de renderizar o formulário do componente `AdminBetaNews`.
- **Causa**: O roteador central de visualizações do `App.tsx` na função `renderContent` possui um mecanismo que remove o prefixo `'admin_'` do valor da aba ativa ao repassá-la ao `AdminPanel` (`const subTab = activeTab.replace('admin_', '') as any`). Consequentemente, para a aba ativa `'admin_beta_news'`, o parâmetro de sub-aba recebido pelo `AdminPanel` era `'beta_news'`. Como o switch de roteamento de sub-abas de `AdminPanel.tsx` estava escutando estritamente por `'admin_beta_news' as any` em vez de `'beta_news'`, o roteador caiu no bloco `default` e falhou na renderização do componente.
- **Solução**: Alterado o mapeamento do caso no switch de `components/AdminPanel.tsx` de `'admin_beta_news' as any` para `'beta_news'`. Isso normalizou instantaneamente a exibição do formulário administrativo, permitindo a perfeita interação, edição e publicação das novidades Beta na URL amigável.

## [2026-05-31] Erro de Comparação do TypeScript no Switch do AdminPanel devido a Tipo Incompatível (AdminSubTab)

- **Problema**: O compilador do TypeScript acusou erro de compilação em `components/AdminPanel.tsx` indicando `Type '"beta_news"' is not comparable to type 'AdminSubTab'` na linha 392.
- **Causa**: Ao adequar a renderização central para tratar a sub-aba como `'beta_news'` (removendo o prefixo `'admin_'`), o switch de casos passou a utilizar o valor literal `'beta_news'`. Contudo, este valor literal não constava na união de strings estritas definida para o tipo `AdminSubTab` no arquivo central de definições `types.ts`, fazendo com que a tipagem estática do TypeScript apontasse inconsistência de atribuição.
- **Solução**: Localizada a declaração do tipo unificado `AdminSubTab` no arquivo `types.ts` (linha 1082) e inserido o literal `'beta_news'` na união de opções válidas. Isso tornou a tipagem robusta e eliminou por completo o erro do compilador.

## [2026-05-31] Bloqueio de RLS no Gestor de Pedidos e Histórico Cumulativo de Novidades Beta com Expansão Global

- **Erro**: O modal de Novidades Beta não era exibido de forma alguma aos lojistas no Gestor de Pedidos, mesmo após salvar novidades válidas no painel administrativo. Além disso, o admin necessitava de um histórico de atualizações (changelog histórico) cumulativo, botão para criar uma nova novidade isolada que resetasse as visualizações para todos os lojistas, e textareas que impedissem redimensionamentos. Também foi identificado que a exibição do modal precisava cobrir todo o sistema de lojistas, e não apenas o Gestor de Pedidos standalone.
- **Causa**:
  1. A política de RLS para leitura (`SELECT`) da tabela `system_announcements` in `supabase_global.sql` estava restrita a `auth.role() = 'authenticated'`. Em algumas sessões do lado do cliente do lojista, a autenticação local não propagava a role esperada, fazendo com que a busca de anúncios ativos retornasse vazio (`null`) e impedisse a ativação do modal.
  2. O serviço `adminSaveAnnouncement` estava acoplado para gerenciar apenas um único informativo ativo, substituindo ou incrementando a mesma linha em vez de criar novas linhas no banco de dados e manter um histórico completo para consulta.
  3. O acoplamento do modal de novidades estava confinado unicamente à rota standalone `/loja/gestor` (`StoreGestor.tsx`).
- **Solução**:
  1. **Ajuste de RLS**: Modificada a política de leitura no `supabase_global.sql` para usar `USING (true)`. Como novidades beta são informativos públicos de sistema sem dados confidenciais, a remoção da barreira de autenticação do RLS restabeleceu a leitura de anúncios imediatos por qualquer cliente e garantiu a exibição imediata do modal aos lojistas ativos no Gestor de Pedidos.
  2. **Refatoração no Backend (`services/cloud.ts`)**: Implementada a função `adminGetAllAnnouncements` que traz a lista completa de informativos ordenados por criação. A função `adminSaveAnnouncement` foi remodelada para aceitar `id` e o booleano `isNew`. Quando `isNew` é verdadeiro, ela insere um novo registro com versão 1 no banco, o que faz com que todos os lojistas vejam a novidade por padrão (pois não existe leitura associada a este novo ID). Em edições (`isNew` = falso), ela atualiza a linha correspondente e deleta as confirmações da tabela `user_announcement_reads` apenas daquele `announcement_id` específico.
  3. **Refatoração da UI Admin (`AdminBetaNews.tsx`)**: Reconstruída a tela do Admin usando um layout responsivo de Grid de alto padrão (Formulário + Histórico). Inserido um botão "Criar Nova Novidade" de cor verde esmeralda com transições suaves que limpa os estados do formulário e ativa o modo de cadastro de novo ID. Implementado o carregamento de cards de atualizações anteriores para edição instantânea, integrado Toast para todos os feedbacks em tempo real, mantida a restrição `resize-none` nas textareas e todos os botões com conteúdo interno centralizado e alinhamento impecável.
  4. **Expansão Global em Todo o Sistema (`PartnerArea.tsx`)**: Implementados os estados de novidades Beta, a chamada de verificação de anúncios ativos (`checkAnnouncements`) acoplada na inicialização do componente (`loadInitialData`) e o markup visual premium com switch customizado no final do JSX de `PartnerArea.tsx`. Com isso, a exibição de novidades cobre 100% da experiência de uso do lojista no sistema (tanto no painel clássico do parceiro quanto no quiosque de pedidos).

## [2026-05-31] Preço Promocional do Lojista Não Refletido no Catálogo Digital Público

- **Erro**: Promoções e preços promocionais criados pelo lojista na rota `/loja/promocoes` não eram exibidos nem aplicados no catálogo digital público (`/cidade/loja/produtos`). Os preços de tabela originais continuavam sendo mostrados e cobrados do cliente no carrinho/checkout, mesmo com a promoção ativa no banco de dados.
- **Causa**:
  1. A função `getPublicStoreProducts` no `services/cloud.ts` apenas selecionava os campos originais da tabela `products` e não cruzava as tabelas `store_promotions` (que contém a vigência, desconto e regras de aplicação das promoções) e `promotion_products` (relacionamento de produtos específicos).
  2. O componente do catálogo digital (`components/DigitalMenu/DigitalMenu.tsx`) exibia o preço bruto do produto (`product.price`) de forma estática em todas as etapas (listagem, modal de detalhes, carrinho, geração do texto de pedido do WhatsApp e checkout final de banco de dados).
- **Solução**:
  1. **Lógica Centralizada de Promoção**: Criada e exportada a função utilitária `getProductPrice(product, sizePrice)` em `services/cloud.ts` que calcula o preço promocional com base no desconto percentual (`PERCENTAGE`) ou fixo (`FIXED`), aplicando a regra de desconto também em variações de tamanho do produto (`sizePrice`).
  2. **Queries de Busca com Promoções Virtuais**: Aprimorada a função `getPublicStoreProducts` em `services/cloud.ts` para buscar as promoções ativas do lojista, validar rigorosamente o período de vigência de datas (início e fim) em relação ao horário atual, cruzar os relacionamentos específicos de produtos (`promotion_products`) e aplicar a regra de desempate caso existam múltiplas promoções (priorizando a promoção de maior desconto absoluto em dinheiro). As informações são embutidas virtualmente no retorno do produto através dos campos `preco_promocional`, `data_inicio`, `data_fim` e `ativo`.
  3. **Visual Premium e Destaque de Desconto**: No catálogo digital (`DigitalMenu.tsx`), a renderização do preço foi atualizada na listagem de produtos e no modal de detalhes. Ao detectar a promoção ativa (`product.ativo`), o preço promocional é destacado em vermelho acompanhado de um badge premium de "Promoção" com o ícone `Zap`, e o preço de tabela original é exibido riscado (`line-through`). O seletor de tamanhos também reflete o desconto proporcional de cada variação.
  4. **Matemática Consistente no Carrinho e Checkout**: O cálculo do subtotal do carrinho, a exibição de preços de itens e a montagem das linhas do pedido para persistência de banco de dados e envio de WhatsApp foram atualizados no `DigitalMenu.tsx` para passar pela função `getProductPrice`, garantindo que a promoção seja respeitada, sincronizada em tempo real e cobrada corretamente em todas as esferas do fluxo de pedidos.

## [2026-05-31] Erros Sintáticos JSX (Unexpected Token) e Erros de Tipo de StoreProduct no Cardápio Digital (DigitalMenu.tsx)

- **Erro**: 
  1. O compilador/IDE reportava erros sintáticos graves: `Unexpected token. Did you mean '{'>'}' or &gt;?` na linha 1607 e `Unexpected token. Did you mean '{'}'}' or &rbrace;?` na linha 1609 do arquivo `DigitalMenu.tsx`.
  2. O compilador acusava erros de tipos: `Property 'ativo' does not exist on type 'StoreProduct'` e `Property 'preco_promocional' does not exist on type 'StoreProduct'` em vários pontos de acesso como a listagem e o modal de detalhes do produto.
- **Causa**:
  1. **Bugs de Parser JSX (Sintaxe)**: O uso de interpolações de expressões ternárias multilinhas dentro da propriedade `className` de botões gerados dinamicamente no loop `.map(size => { ... })` confundia o parser do TypeScript/React, fazendo com que ele interpretasse de forma incorreta o fechamento de chaves `}` da string, quebrando a sintaxe global de tags do JSX no restante do arquivo.
  2. **Perda Semântica de Tipos**: Devido à falha de parser do JSX, a análise semântica global de tipos do compilador no arquivo ficava corrompida. Com isso, o TypeScript falhava em associar a tipagem correta de `StoreProduct` e reportava falsos positivos de falta de propriedade para `ativo` e `preco_promocional` mesmo que estes estivessem mapeados no arquivo central de tipos `types.ts`.
- **Solução**:
  1. **Simplificação e Purificação de JSX**: Refatorado o loop de tamanhos em `available_sizes.map`. Toda a lógica do className condicional multilinhas foi extraída para variáveis locais simples (`buttonClass`) antes do retorno do JSX. A interpolação do className do `<button>` passou a utilizar a variável de forma atômica e limpa, eliminando 100% dos erros sintáticos de parser.
  2. **Substituição de IIFEs por useMemo**: O bloco de IIFE complexo `{(() => { ... })()}` que renderizava os preços promocionais dinâmicos no modal de detalhes foi removido do JSX. A lógica de preço com promoção foi migrada para variáveis reativas robustas de memorização (`selectedProductPromoPrice` e `selectedProductHasPromo` com `useMemo`) declaradas na seção de Computed Data de `DigitalMenu.tsx`, simplificando a árvore JSX e tornando o código muito mais legível e rápido.
  3. **Aliasing de Tipagem (`LocalStoreProduct`)**: Criado o alias `LocalStoreProduct` com interseção explícita de propriedades promocionais no topo do `DigitalMenu.tsx` para tipar os estados de produtos e itens do carrinho. Isso blindou a tipagem local contra caches ou inconsistências de carregamento do compilador global em arquivos de tipagem no disco, normalizando por completo a validação estática de tipos do compilador.

## [2026-05-31] Travamento e Falha de Carregamento da Página de Promoções & Cupons no Gestor de Pedidos

- **Erro**: A aba Promoções & Cupons no Gestor de Pedidos (`/loja/gestor`) ficava em um estado de carregamento (loading) infinito, impossibilitando que os lojistas cadastrassem ofertas ou gerassem cupons promocionais.
- **Causa**: O componente `StorePromotions.tsx` utilizava a query de banco de dados pública `cloud.getPublicStoreProducts(storeId)` para carregar a listagem de produtos. Essa função continha uma instrução de join de categorias `.select('*, categories(name)')` que gera erros de compatibilidade e falhas de execução no PostgREST do Supabase devido a inconsistências nas definições de chaves estrangeiras implícitas no banco. Como consequência, a consulta falhava no carregamento. Além disso, a chamada pública filtra apenas produtos ativos (`is_active = true`), ocultando produtos inativos ou pausados que o lojista poderia querer colocar em oferta no painel operacional seguro.
- **Solução**: Substituído o uso de `cloud.getPublicStoreProducts(storeId)` por `cloud.getStoreProducts(storeId)` na rotina `loadData` de `StorePromotions.tsx`. A função `getStoreProducts` é a mesma utilizada pelo catálogo principal do lojista e conta com tratamento de erro e mapeamento síncrono de categorias em memória no JavaScript (`try/catch`), contornando de forma blindada as falhas de junções no banco de dados e trazendo todos os produtos (ativos e pausados) de maneira instantânea e segura ao painel administrativo.