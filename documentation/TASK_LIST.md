# Lista de Tarefas - Correções de Sistema

- [x] Corrigido erro de "Preço inválido" ao adicionar itens avulsos na comanda (`InternalOrders.tsx` e `CollaboratorModule.tsx`).
- [x] Padronizada função `parseCurrency` em `MerchantPOS.tsx`, `AdminFees.tsx` e `DailyPanel.tsx` para garantir robustez no tratamento de valores formatados.
- [x] Corrigido erro de compilação TypeScript no `overpassService.ts` que impedia o deploy no Vercel (acesso a propriedades de tipos union).