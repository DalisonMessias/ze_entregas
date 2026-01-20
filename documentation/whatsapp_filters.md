# Filtros de Conversas - WhatsApp Interno

Este documento descreve as funcionalidades disponíveis nos filtros de ordenação e filtragem da lista de conversas no módulo de WhatsApp.

## Filtros Disponíveis

A interface dispõe de um carrossel de filtros rápidos que alteram como as conversas são exibidas e organizadas:

### 1. Recentes (`recent`)
*   **Comportamento**: Ordena as conversas pela data/hora da última mensagem recebida ou enviada.
*   **Utilidade**: Padrão do WhatsApp, mantém as conversas mais ativas no topo.

### 2. Não lidas (`unread`)
*   **Comportamento**: Filtra a lista para exibir **apenas** conversas que possuem mensagens ainda não visualizadas pelo atendente.
*   **Ordenação**: Dentro do filtro, as conversas são ordenadas pela quantidade de mensagens não lidas (maior para menor).

### 3. Manual (`manual`)
*   **Comportamento**: Permite que o atendente **reorganize livremente** as conversas arrastando e soltando.
*   **Persistência**: A ordem definida é salva individualmente para cada atendente na loja, permitindo um fluxo de trabalho personalizado.

### 4. Em aberto (`inprogress`)
*   **Comportamento**: Filtra a lista para exibir apenas conversas com o status `open`.
*   **Utilidade**: Foca nos atendimentos que ainda requerem ação ou estão em andamento.

### 5. Prioridade (`priority`)
*   **Comportamento**: Ordena a lista com base no nível de prioridade atribuído manualmente à conversa.
*   **Níveis**: Crítica > Alta > Normal > Baixa.
*   **Visual**: Conversas com prioridade aparecem com uma borda colorida indicativa na lateral esquerda.

### 6. Encerradas (`closed`)
*   **Comportamento**: Filtra a lista para exibir apenas conversas que foram marcadas como `closed`.
*   **Utilidade**: Permite consultar atendimentos finalizados.

---

## Barra de Busca

A barra de busca atua de forma complementar aos filtros:
*   **Busca por Nome**: Pesquisa nos nomes dos contatos.
*   **Busca por Número**: Pesquisa por dígitos do telefone.
*   **Combinação**: Se um filtro (ex: Não lidas) estiver ativo, a busca filtrará apenas dentro daquele conjunto.
