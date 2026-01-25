# Lista de Tarefas - Refatoração Chat Interno

## Correção Urgente (Bug 500)
- [x] Remover bloqueio de "auto-chat" em `internalChatService.ts` que impede visitantes de enviar mensagens.
- [ ] Verificar se o envio de mensagens funciona após a correção.

## Refatoração de Backend (Renomeação)
- [x] Renomear rota `/api/whatsapp` para `/api/chat`.
- [x] Renomear arquivo `server/routes/whatsapp.ts` para `server/routes/chat.ts`.
- [x] Renomear arquivo `server/controllers/whatsappController.ts` para `server/controllers/chatController.ts`.
- [x] Renomear arquivo `server/controllers/whatsappMediaController.ts` para `server/controllers/chatMediaController.ts`.
- [x] Atualizar referências e imports no `server/index.ts` (ou `app.ts`).

## Refatoração de Frontend (Renomeação e Limpeza)
- [x] Atualizar todas as chamadas de API no frontend de `/api/whatsapp` para `/api/chat`.
- [x] Renomear componente `WhatsappContainer.tsx` para `InternalChatContainer.tsx` (Feito via cópia e ajuste de código).
- [x] Renomear pasta `components/Whatsapp` para `components/InternalChat` (Feito via cópia; pasta antiga removida se possível).
- [x] Atualizar rotas no `App.tsx` e `routeMap.ts` para refletir os novos nomes (`whatsapp_chat` -> `internal_chat`).
- [x] Atualizar sidebar/menu para mostrar "Chat Interno" em vez de "Whatsapp".

## Banco de Dados (Migração Completa)
- [x] Renomear tabelas no `supabase_global.sql` (`whatsapp_messages` -> `chat_messages`, etc) com blocos de migração segura.
- [x] Adicionar comandos `ALTER TABLE ... RENAME TO` para preservar dados.

## Backend (Atualização de Referências)
- [x] Atualizar `server/services/internalChatService.ts` para usar tabelas `chat_...`.
- [x] Atualizar `server/controllers/chatController.ts` e `chatContactsController.ts`.
- [x] Atualizar serviços legados (`whatsappService.ts`, `useDatabaseAuth.ts`) para consistência.

## Frontend (Atualização de Referências)
- [x] Renomear e atualizar `services/chatOfflineService.ts` (ex-whatsappOfflineService).
- [x] Atualizar `components/InternalChat/InternalChatContainer.tsx` para importar o novo serviço.
- [ ] Validar fluxo de conversa Loja -> Visitante.
- [ ] Validar recebimento de mensagens em tempo real (WebSocket).
