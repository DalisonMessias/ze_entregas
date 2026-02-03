# Refletir Opções de Entrega/Retirada da Loja no Carrinho

## Objetivo
Garantir que o carrinho do Menu Digital exiba apenas as opções de entrega (Delivery ou Pickup) que estão habilitadas nas configurações da loja.

## Problema Atual
As abas "Entrega" e "Retirada" no carrinho são renderizadas incondicionalmente, permitindo que o usuário selecione uma opção que a loja pode ter desativado.

## Solução Proposta
1.  **Verificar Configurações**: Utilizar `deliverySettings` (`is_own_delivery_enabled`, `is_partner_delivery_enabled`, `is_pickup_enabled`).
2.  **Renderização Condicional**:
    *   Se ambas (Entrega e Retirada) estiverem ativas: Mostrar as duas abas (comportamento atual).
    *   Se apenas Entrega estiver ativa: Ocultar abas e forçar modo Entrega.
    *   Se apenas Retirada estiver ativa: Ocultar abas e forçar modo Retirada.
    *   Se nenhuma estiver ativa (caso raro/erro): Mostrar mensagem ou bloquear.
3.  **Estado Inicial**: Garantir que o `deliveryType` seja inicializado com a opção válida disponível.

### 1. Branding do Sistema
- **Rodapé Fixo (Cor Total)**: O logo do Zé Entregas será movido para o rodapé e exibido com **opacidade 100% (cor total)**, deixando de ser semitransparente.

### 2. Identidade da Loja e Uploads
- **Upload de Logo**: Adicionar um botão de upload para que o lojista possa subir sua própria imagem de logo diretamente no gerador.
- **Upload de Fundo**: Adicionar suporte para upload de uma imagem de fundo para as páginas do catálogo.
- **Toggle Nome vs Logo**: Interface clara para escolher se o cabeçalho exibe o nome (texto) ou o logo (imagem).

### 3. Design de Página
- **Fundo Dinâmico**: O usuário poderá alternar entre usar uma **cor sólida** ou uma **imagem de fundo** personalizada.
- **Espaçamento (Gap)**: Refinar o controle de espaçamento para garantir que os blocos de produtos tenham "respiro" visual.

### 4. Fontes e Estilos
- **Tipografia**: Suporte a diferentes famílias de fontes para títulos e preços.

## Detalhes Técnicos
- Utilizar `FileReader` para pré-visualização instantânea de logos e fundos carregados.
- Atualizar `CatalogSettings` para persistir os caminhos/base64 das imagens.
- Ajustar o CSS do rodapé no `PrintCatalogGenerator`.

## Arquivos Afetados
*   `components/DigitalMenu/DigitalMenu.tsx`

## Passos de Implementação
- [ ] Ler `DigitalMenu.tsx` para identificar o bloco de renderização das abas.
- [ ] Implementar lógica derivada para `isDeliveryAvailable` e `isPickupAvailable`.
- [ ] Alterar a UI das abas para renderizar apenas se ambas estiverem disponíveis, ou mostrar um indicador estático se apenas uma estiver.
- [ ] Verificar a lógica de inicialização do estado `deliveryType`.
