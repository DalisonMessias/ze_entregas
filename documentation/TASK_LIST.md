# Lista de Tarefas - Ajustes na Comanda Interna

## Fluxo de Status e Exibição

- [ ] **Ajustar Sub-aba "Rejeitados/Cancelados"**:
  - [ ] Garantir que a filtragem por data funcione corretamente, exibindo apenas os pedidos do período selecionado.
  - [ ] Adicionar um botão "Editar Status" em cada pedido rejeitado/cancelado.
  - [ ] Implementar a lógica para que o botão "Editar Status" permita mover o pedido de volta para a "Fila de Produção" (status `pending`).

- [ ] **Ajustar Aba "Histórico" e Sub-aba "Finalizados"**:
  - [ ] Garantir que, por padrão, a aba "Histórico" e a sub-aba "Finalizados" exibam apenas os pedidos do dia atual.
  - [ ] Verificar e corrigir, se necessário, o filtro de data para consultar dias anteriores.
  - [ ] Assegurar que todos os pedidos com status `COMPLETED` sejam exibidos *apenas* na aba "Finalizados".

- [ ] **Refatorar Lógica de Finalização de Pedidos**:
  - [ ] Modificar a função `handleUpdateTicketStatus` para garantir que todas as ações de finalização (entregar, enviar, etc.) alterem o status do pedido para `COMPLETED`.
  - [ ] Garantir que, após a finalização, os pedidos sejam removidos das abas de produção ("Prontos p/ Entrega", "Prontos p/ Retirada", "Consumo Local").

- [ ] **Revisão e Consistência**:
  - [ ] Revisar todo o fluxo para evitar duplicidade de pedidos entre as abas.
  - [ ] Garantir que a UI reflita consistentemente o status do pedido em todas as seções.
