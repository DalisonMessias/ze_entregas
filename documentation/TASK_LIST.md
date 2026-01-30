# Lista de Tarefas - Ajustes na Comanda Interna

## Fluxo de Status e Exibição

- [x] **Ajustar Sub-aba "Rejeitados/Cancelados"**:
  - [x] Garantir que a filtragem por data funcione corretamente, exibindo apenas os pedidos do período selecionado.
  - [x] Adicionar um botão "Editar Status" em cada pedido rejeitado/cancelado.
  - [x] Implementar a lógica para que o botão "Editar Status" permita mover o pedido de volta para a "Fila de Produção" (status `pending`).

- [x] **Ajustar Aba "Histórico" e Sub-aba "Finalizados"**:
  - [x] Garantir que, por padrão, a aba "Histórico" e a sub-aba "Finalizados" exibam apenas os pedidos do dia atual.
  - [x] Verificar e corrigir, se necessário, o filtro de data para consultar dias anteriores.
  - [x] Assegurar que todos os pedidos com status `COMPLETED` sejam exibidos *apenas* na aba "Finalizados".

- [x] **Refatorar Lógica de Finalização de Pedidos**:
  - [x] Modificar a função `handleUpdateTicketStatus` para garantir que todas as ações de finalização (entregar, enviar, etc.) alterem o status do pedido para `COMPLETED`.
  - [x] Garantir que, após a finalização, os pedidos sejam removidos das abas de produção ("Prontos p/ Entrega", "Prontos p/ Retirada", "Consumo Local").

- [x] **Revisão e Consistência**:
  - [x] Revisar todo o fluxo para evitar duplicidade de pedidos entre as abas.
  - [x] Garantir que a UI reflita consistentemente o status do pedido em todas as seções.