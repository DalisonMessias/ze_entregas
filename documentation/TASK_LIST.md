# WhatsBot Pro: Upload e Contatos Reais

## Tarefas

- [ ] DB: Criar tabela `public.whatsbot_contacts` e atualizar RPC `get_whatsbot_available_contacts`
- [ ] Backend: Adicionar listener `contacts.upsert` e `messaging-history.set` no `WhatsBotInstance`
- [ ] Backend: Implementar lógica de persistência de contatos (nome/número) no banco
- [ ] Frontend: Remover comportamento `sticky` do bloco QR Code em `WhatsBot.tsx`
- [ ] Frontend: Reposicionar o bloco "Campanhas de Marketing" abaixo do "Catálogo Digital"
- [ ] Frontend: Implementar upload de arquivos no componente `ImageInput`
- [ ] Frontend: Ajustar Modal de Campanha para mostrar nomes dos contatos
