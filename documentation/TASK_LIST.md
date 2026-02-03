# Lista de Tarefas - Ajuste Lógica Vendas POS

- [ ] Criar tabela `platform_settings` no `supabase_global.sql` para armazenar chave Pix da plataforma.
- [ ] Inserir chave Pix da plataforma inicial (placeholder ou real se fornecida, usarei placeholder editável).
- [ ] Criar função RPC `get_platform_pix_key` para o front-end buscar a chave.
- [ ] Criar função RPC `process_partner_sale_wallet` para creditar a carteira do entregador parceiro.
- [ ] Atualizar `hooks/useMerchantPOS.ts`:
    - [ ] Modificar `initiatePayment` para usar `get_platform_pix_key` se for entregador parceiro.
    - [ ] Garantir que vendas de parceiros não usem chave da loja.
- [ ] Atualizar `components/MerchantPOSDesktop.tsx` e `components/MerchantPOSMobile.tsx`:
    - [ ] Modificar `handleFinalizeSale` (ou equivalente).
    - [ ] Se usuário é `delivery_partner` (não associado):
        - [ ] Chamar `process_partner_sale_wallet`.
        - [ ] Não chamar `createTerminalTransaction` (que gera histórico de loja).
        - [ ] Exibir sucesso de "Crédito na Carteira".
- [ ] Verificar e atualizar `checklist.txt`.
