# Walkthrough - Correção de Configurações de Entrega

## Problema Identificado
O sistema apresentava erros ao tentar salvar configurações de entrega:
1.  **Backend:** Erro `Could not find the 'delivery_time_max' column...`. A tabela `store_delivery_settings` estava ausente no arquivo `supabase_global.sql` e no banco.
2.  **Frontend:** Warning do React sobre "uncontrolled input" ao carregar a página, devido a valores iniciais indefinidos.

## Solução Implementada

### 1. Banco de Dados (Supabase)
Adicionada a definição completa da tabela `store_delivery_settings` ao arquivo principal de migrações (`supabase_global.sql`).

**Schema Criado:**
-   `id`, `store_id` (vinculado ao lojista)
-   `is_pickup_enabled`, `is_own_delivery_enabled`, `is_partner_delivery_enabled`
-   `own_delivery_mode` (FIXED, NEIGHBORHOOD)
-   `radius_km`, `fixed_fee`
-   **Novas Colunas:** `delivery_time_min`, `delivery_time_max` (Inteiros, default 30-60 min)
-   Políticas de Segurança (RLS) para permitir leitura pública (menu digital) e gestão pelo dono da loja.

### 2. Frontend (`StoreDeliverySettings.tsx`)
Ajustada a renderização dos inputs para garantir que `value` nunca seja `undefined`.

**Antes:**
```tsx
value={String(settings.delivery_time_min)} // Se undefined, vira "undefined" (string) ou causa erro de controle
```

**Depois:**
```tsx
value={String(settings.delivery_time_min ?? 30)} // Default seguro
```
Isso previne que o React reclame de mudança de input não controlado para controlado.

## Como Validar
1.  Rode a migração SQL ou o comando de atualização do banco (se aplicável ao ambiente de dev).
2.  Acesse **Painel da Loja > Configurações > Entrega**.
3.  A página deve carregar sem erros no console.
4.  Tente alterar o Tempo de Entrega e Salvar.
    *   **Sucesso:** Mensagem "Configurações salvas com sucesso!".
    *   **Erro:** Se persistir erro de coluna, verifique se a tabela foi criada corretamente no Supabase.
