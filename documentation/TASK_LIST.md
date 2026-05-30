## Sistema de Bloqueio de Clientes (Anti-Spam e Banimento)

- [x] Criar a tabela `store_blocked_users` nos arquivos `supabase_global.sql` e `supabase_global_part3.sql` para gerenciar bloqueios por loja (telefone, email, ip).
- [x] Corrigir erro onde o Bot continuava respondendo para números bloqueados (verificação adicionada ao whatsBotService).
- [x] Melhorar o tempo de carregamento da página /loja/gestor na aba WhatsBot passando o storeId diretamente.
- [x] Adicionar interface no `WhatsBot` (Gestor) para gerenciar contatos bloqueados (listar, adicionar, remover bloqueios).
- [x] Adicionar botão/opção "Bloquear Cliente" no Gestor de Pedidos (`InternalOrders` ou painel lateral de detalhes do pedido).
- [x] Atualizar as validações do Checkout (app cliente) para impedir a criação de pedidos caso o telefone/email esteja na lista de bloqueados, retornando mensagem genérica.
- [x] Atualizar `zeAssistantService` ou `whatsBotService` para ignorar ou bloquear mensagens recebidas de números bloqueados.
