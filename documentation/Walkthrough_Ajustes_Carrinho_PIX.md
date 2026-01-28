# Walkthrough - Ajustes no Carrinho e Fluxo PIX

## Mudanças Realizadas

### 1. Fluxo de Pagamento PIX (DigitalMenu.tsx) - *Updated*
*   **Visibilidade do Botão:** O botão "PIX" (Auto) ou (Manual) agora aparece **sempre que há uma chave PIX configurada** (seja na plataforma ou cadastro simples).
*   **Comportamento no Checkout (Lógica Híbrida):**
    *   **Automático (Plataforma):** Se a `loja recebe pela plataforma` E `pix automático está ativo` -> Abre o **Modal com QR Code**.
    *   **Manual (WhatsApp):** Caso contrário -> Trata como um pedido normal e envia mensagem para o **WhatsApp** informando pagamento via PIX (usuario deve solicitar chave ou enviar comprovante manual).
*   **Indicação Visual:** O botão exibe a tag `(Auto)` apenas se o fluxo automático estiver habilitado.

### 2. Interface do Carrinho
*   **Entrega Grátis:** Quando a taxa de entrega for R$ 0,00, o texto exibido agora é **"Grátis* (Ver normas)"** em vez de apenas "Grátis", indicando que existem condições (como valor mínimo).
*   **Seleção de Bairros:** Verificado e mantido o funcionamento do seletor de bairros, que lista as taxas cadastradas quando o modo de entrega é "Por Bairro".

### 3. Correções de Código
*   **Lint Fix:** Removida a tentativa de alterar `store.settings` (propriedade inexistente no tipo `PartnerProfile`), resolvendo o erro de compilação e usando as propriedades corretas (`receive_orders_via_platform`).

## Como Testar
1.  Acesse uma loja com **Receber via Plataforma ATIVO**.
    *   Adicione itens ao carrinho.
    *   Verifique se o botão "PIX (Auto)" aparece.
    *   Finalize o pedido com PIX -> Deve abrir o Modal com QR Code.
2.  Desative a opção "Receber via Plataforma" nas configurações da loja.
    *   Acesse o menu digital.
    *   O botão PIX **não deve aparecer**.
    *   Os pedidos (Dinheiro/Cartão) devem ir para o WhatsApp normalmente.
3.  Teste o Frete Grátis (se configurado nas Regras de Entrega).
    *   Verifique se o texto "Grátis* (Ver normas)" aparece no rodapé.
