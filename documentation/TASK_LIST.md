# Lista de Tarefas - Refatoração Chat Interno

## Correção Urgente (Bug 500)
- [x] Remover bloqueio de "auto-chat" em `internalChatService.ts` que impede visitantes de enviar mensagens.
- [ ] Verificar se o envio de mensagens funciona após a correção.

## Refatoração de Backend (Renomeação)
- [ ] Renomear rota `/api/whatsapp` para `/api/chat`.
- [ ] Renomear arquivo `server/routes/whatsapp.ts` para `server/routes/chat.ts`.
- [ ] Renomear arquivo `server/controllers/whatsappController.ts` para `server/controllers/chatController.ts`.
- [ ] Renomear arquivo `server/controllers/whatsappMediaController.ts` para `server/controllers/chatMediaController.ts`.
- [ ] Atualizar referências e imports no `server/index.ts` (ou `app.ts`).

## Refatoração de Frontend (Renomeação e Limpeza)
- [ ] Atualizar todas as chamadas de API no frontend de `/api/whatsapp` para `/api/chat`.
- [ ] Renomear componente `WhatsappContainer.tsx` para `InternalChatContainer.tsx`.
- [ ] Renomear pasta `components/Whatsapp` para `components/InternalChat`.
- [ ] Atualizar rotas no `App.tsx` e `routeMap.ts` para refletir os novos nomes (`whatsapp_chat` -> `internal_chat`).
- [ ] Atualizar sidebar/menu para mostrar "Chat Interno" em vez de "Whatsapp".

## Banco de Dados
- [ ] (Opcional) Manter nomes de tabelas `whatsapp_...` por enquanto para evitar perda de dados, mas documentar que referem-se ao Chat Interno.

## Testes
- [ ] Validar fluxo de conversa Visitante -> Loja.
- [ ] Validar fluxo de conversa Loja -> Visitante.
- [ ] Validar recebimento de mensagens em tempo real (WebSocket).
