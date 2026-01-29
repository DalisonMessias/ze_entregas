# Lista de Tarefas - Ajuste de Conformidade PIX

- [ ] Analisar `utils/pixPayloadGenerator.ts` para entender a geração atual.
- [ ] Analisar `components/PixPaymentModal.tsx` para entender o uso atual.
- [ ] Implementar `normalizarNomePix` em `utils/pixPayloadGenerator.ts` (Max 25 chars, sem acentos, chars especiais).
- [ ] Implementar `normalizarCidadePix` em `utils/pixPayloadGenerator.ts` (Max 15 chars, sem UF, sem acentos, abreviação inteligente).
- [ ] Atualizar `gerarPayloadPix` para usar as funções de normalização.
- [ ] Refatorar `components/PixPaymentModal.tsx` para usar `useMemo` e garantir payload único e imutável por sessão.
- [ ] Garantir que o botão "Copiar PIX" usa o mesmo payload do QR Code.