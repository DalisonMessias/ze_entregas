# Plano de Implementação - Integração de Adicionais (Grupos e Avulsos)

- [x] Adicionar coluna `addon_group_id` na tabela `products` em `supabase_global.sql`
- [x] Adicionar coluna `addon_options` (JSONB) para Adicionais Avulsos em `products` e `store_products`
- [x] Atualizar interfaces `Product` e `StoreProduct` em `types.ts`
- [x] Implementar seção de gerenciamento de Adicionais Avulsos no `ProductModal.tsx`
- [x] Refatorar `ProductAddonSelector.tsx` para suporte híbrido (Grupo + Avulsos)
- [x] Integrar Modal de Seleção de Adicionais no Cardápio Digital (`DigitalMenu.tsx`)
- [x] Lógica para abrir o modal ao adicionar produto com qualquer tipo de adicional
- [x] Melhorar visual do catálogo para design premium e minimalista
- [x] Testar integração e cálculos de preços no carrinho
- [x] Corrigido erro de tipo logo_url no DigitalMenu.tsx
