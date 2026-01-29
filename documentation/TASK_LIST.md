# Lista de Tarefas - Ajuste de Conformidade PIX

- [x] Analisar `utils/pixPayloadGenerator.ts` para entender a geração atual.
- [x] Analisar `components/PixPaymentModal.tsx` para entender o uso atual.
- [x] Implementar `normalizarNomePix` em `utils/pixPayloadGenerator.ts`.
- [x] Implementar `normalizarCidadePix` em `utils/pixPayloadGenerator.ts`.
- [x] Atualizar `gerarPayloadPix`.
- [x] Refatorar `components/PixPaymentModal.tsx`.
- [x] Garantir consistência do botão copiar.
- [x] Ajustar `normalizarCidadePix`: Remover abreviação inteligente (Revertido por nova solicitação).
- [x] Adicionar campo "01" (Point of Initiation Method) com valor "12" no payload.
- [x] Atualizar `OrderTracking.tsx`: Incluir campo `name` na query do Supabase.
- [x] Atualizar `OrderTracking.tsx`: Usar `store.name` como prioritário no modal PIX.
- [ ] Implementar `normalizarChavePix` em `utils/pixPayloadGenerator.ts` (Auto-detect & Format).
- [x] Restaurar/Aprimorar `normalizarCidadePix` com abreviação inteligente. (Revertido novamente a pedido do usuário)
- [ ] Atualizar `utils/pixPayloadGenerator.ts`: Remover abreviação inteligente, manter apenas corte de 15 chars e remoção de UF.
- [ ] Atualizar `PixPaymentModal` para passar `key_type` se disponível para melhor precisão.