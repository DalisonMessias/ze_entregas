# Plano de Implementação - Teclado Virtual Lateral

## Objetivo
Atender à solicitação do usuário de incluir um teclado virtual na lateral direita da tela de "Nova Venda" (step `amount`) no modo Desktop, permitindo a digitação de valores com o mouse/touch, além de garantir que o teclado físico continue funcionando.

## Itens Atuais
- O teclado físico já é tratado por `handlePhysicalKeyboard`.
- O componente `Keypad` já existe e é exibido na parte inferior da tela em steps específicos.

## Mudanças Propostas

### `components/MerchantPOSDesktop.tsx`

1.  **Definir Lógica de Exibição do Keypad**:
    - Garantir que a variável `showKeypad` esteja definida corretamente, considerando os steps: `['amount', 'pin_lock', 'create_pin', 'confirm_pin', 'sales_simulator']`.

2.  **Ajustar Layout do Step "amount"**:
    - Alterar a estrutura do `case 'amount'` para, quando `isDesktop` for verdadeiro, exibir o `Keypad` em uma coluna à direita.
    - Manter o layout atual (centralizado/coluna única) para Mobile.

3.  **Controlar Exibição Duplicada**:
    - Se o teclado estiver sendo exibido na lateral (Desktop + Step Amount), ocultar o teclado flutuante inferior para evitar duplicação.

## Plano de Verificação

### Verificação Manual
1.  **Modo Desktop**:
    - Acessar a tela de "Nova Venda".
    - Verificar se o teclado numérico aparece na lateral direita.
    - Tentar digitar valores usando o teclado virtual.
    - Tentar digitar valores usando o teclado físico (números, backspace, enter).
    - Verificar se o valor é atualizado corretamente.
2.  **Modo Mobile (Simulado)**:
    - Redimensionar a janela.
    - Verificar se o teclado aparece na parte inferior (comportamento padrão).

### Comandos de Teste
- Não há testes automatizados para UI visual, a validação será visual e funcional via browser.
