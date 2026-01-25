# Lista de Tarefas - Implementação de Chat e Broadcast

## 1. Correções de Chat (Visitante/Loop Loading)
- [x] Investigar loop de loading no `StoreChatPage`.
- [x] Identificar falta de RPC pública para dados da loja.
- [x] Criar RPC `public_get_store_by_slug` no `supabase_global.sql`.
- [x] Corrigir erro de coluna inexistente (`state`) na RPC. 
- [x] Atualizar `cloud.ts` para usar a nova RPC.
- [x] Corrigir permissões RLS da tabela `store_quick_replies`.

## 2. Funcionalidade de Broadcast (Disparo em Massa)
- [x] Identificar componente de chat (`WhatsappContainer`).
- [x] Criar componente `BroadcastModal` com lógica de envio em loop.
- [x] Adicionar botão "Megafone" na barra lateral de ferramentas do chat.
- [x] Integrar modal no fluxo principal do `WhatsappContainer`.

## 3. Rotas e Navegação
- [x] Adicionar rota `/chat` explícita no `App.tsx` apontando para `WhatsappContainer`.

## Observações
- O envio em massa é feito via frontend com delay humanizado para evitar bloqueio.
- As correções de banco de dados (RPC/RLS) precisam ser executadas manualmente no Supabase pelo usuário.
