# Lista de Tarefas - Melhorias no POS Desktop

- [x] Analisar `MerchantPOSDesktop.tsx` para corrigir entrada de teclado físico.
- [x] Implementar suporte ao teclado físico para digitar valores.
- [x] Adicionar um teclado numérico virtual na lateral direita da interface (Desktop).
- [x] Verificar layout e estilização para acomodar o novo teclado.
- [x] Ocultar teclado flutuante quando o lateral estiver visível.
- [x] Corrigir erro de redeclaração da variável `showKeypad`.
- [x] Remover opção "Ler Cartão/QR" do menu de pagamentos (incompatível com Desktop sem câmera).

## Melhorias Implementadas

1.  **Teclado Lateral**: Adicionado `Keypad` na lateral direita durante o step `amount` quando em Desktop.
2.  **Lógica `showKeypad`**: Corrigida para evitar sobreposição e erros de redeclaração.
3.  **Botão Cobrar**: Adicionado botão explícito.
4.  **Remoção de Funcionalidade**: Removido botão de "Ler Cartão/QR" em `MerchantPOSDesktop.tsx` e ajustado grid para 2 colunas.
