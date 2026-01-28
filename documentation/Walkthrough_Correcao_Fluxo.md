# Walkthrough - Correção de Configurações e Fluxo de Pedidos

## Alterações Realizadas

### 1. Configurações da Loja Independente (`StoreSettings.tsx`)
**Mudança:** Removida a dependência mútua entre os botões de ativação "Receber via Plataforma" e "Receber via WhatsApp".
**Resultado:** Agora o lojista pode manter ambas as opções ativadas simultaneamente, permitindo cenários híbridos (ex: PIX via Plataforma e Dinheiro via WhatsApp).

### 2. Fluxo de Pedidos Inteligente (`DigitalMenu.tsx`)
Implementada nova lógica de decisão (`flowMode`) no checkout do cliente:

- **Prioridade PIX:** Se o cliente escolher pagamento via PIX e a loja tiver uma chave cadastrada, o pedido **sempre** será processado pela Plataforma.
  - Isso garante a geração do QR Code e a exibição do modal de pagamento ("Copia e Cola").
  - Evita a mensagem de "Pagamento Indisponível" que ocorria anteriormente.

- **Fluxo WhatsApp:** Para outras formas de pagamento (Dinheiro, Cartão):
  - Se "Receber via WhatsApp" estiver **ATIVO**: O pedido será preenchido e enviado para o WhatsApp da loja.
  - Se "Receber via WhatsApp" estiver **INATIVO**: O pedido será processado internamente pela Plataforma (Comanda Digital).

## Como Testar

### Cenário 1: Configuração
1. Acesse `/loja/configuracoes`.
2. Habilite "Receber via Plataforma" E "Receber via WhatsApp".
3. Verifique se ambos permanecem ativos.

### Cenário 2: Cliente (PIX)
1. No cardápio, adicione itens e vá para o checkout.
2. Escolha pagamento "PIX".
3. Finalize o pedido.
4. **Verificação:** O sistema deve criar o pedido e abrir o modal com o QR Code (não deve abrir o WhatsApp).

### Cenário 3: Cliente (Dinheiro + WhatsApp Ativo)
1. Nas configurações, mantenha "Receber via WhatsApp" ATIVO.
2. No cardápio, escolha pagamento "Dinheiro".
3. Finalize o pedido.
4. **Verificação:** O sistema deve abrir o WhatsApp com os detalhes do pedido preenchidos.

### Cenário 4: Cliente (Dinheiro + WhatsApp Inativo)
1. Nas configurações, DESATIVE "Receber via WhatsApp".
2. No cardápio, escolha pagamento "Dinheiro".
3. Finalize o pedido.
4. **Verificação:** O sistema deve criar o pedido internamente e redirecionar para a tela de acompanhamento/sucesso.
