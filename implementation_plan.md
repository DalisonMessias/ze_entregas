# Refletir Opções de Entrega/Retirada da Loja no Carrinho

## Objetivo
Garantir que o carrinho do Menu Digital exiba apenas as opções de entrega (Delivery ou Pickup) que estão habilitadas nas configurações da loja.

## Problema Atual
As abas "Entrega" e "Retirada" no carrinho são renderizadas incondicionalmente, permitindo que o usuário selecione uma opção que a loja pode ter desativado.

## Solução Proposta
1.  **Verificar Configurações**: Utilizar `deliverySettings` (`is_own_delivery_enabled`, `is_partner_delivery_enabled`, `is_pickup_enabled`).
2.  **Renderização Condicional**:
    *   Se ambas (Entrega e Retirada) estiverem ativas: Mostrar as duas abas (comportamento atual).
    *   Se apenas Entrega estiver ativa: Ocultar abas e forçar modo Entrega.
    *   Se apenas Retirada estiver ativa: Ocultar abas e forçar modo Retirada.
    *   Se nenhuma estiver ativa (caso raro/erro): Mostrar mensagem ou bloquear.
3.  **Estado Inicial**: Garantir que o `deliveryType` seja inicializado com a opção válida disponível.

### 1. Branding do Sistema
- **Rodapé Fixo (Cor Total)**: O logo do Zé Entregas será movido para o rodapé e exibido com **opacidade 100% (cor total)**, deixando de ser semitransparente.

### 2. Identidade da Loja e Uploads
- **Upload de Logo**: Adicionar um botão de upload para que## Proximas Etapas (Ajustes de Feedback)

### Preview Mobile
- [MODIFY] [MobileBannerPreview.tsx](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/components/MobileBannerPreview.tsx): Refatorar layout para corresponder exatamente à página de listagem de lojas (banner de fundo, logo redondo sobreposto).

### Chat Exclusivo
- [MODIFY] [ChatExclusivoModal.tsx](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/components/ChatExclusivoModal.tsx): Integrar lógica de horário de expediente do suporte administrativo (`shop_settings`). Exibir aviso quando fora de horário.

## Plano de Verificação Final
# Implementação de Categorias de Loja com Imagem e Carrossel

Este plano detalha as alterações para permitir que categorias de lojas tenham imagens, sejam selecionáveis no cadastro e exibidas em um carrossel na página da cidade.

## Mudanças Propostas

---

### [Componente] Banco de Dados (Supabase)

#### [MODIFY] [supabase_global.sql](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/supabase/migrations/supabase_global.sql)
- Adicionar coluna `image_url` à tabela `institutional_categories`.
- Adicionar coluna `store_category_id` à tabela `user_profiles` (referenciando `institutional_categories.id`).

---

### [Componente] Tipos e Serviços

#### [MODIFY] [types.ts](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/types.ts)
- Atualizar interface `InstitutionalCategory` para incluir `image_url?: string;`.

#### [MODIFY] [services/cloud.ts](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/services/cloud.ts)
- Adicionar função `uploadInstitutionalCategoryImage` para fazer upload da imagem da categoria.
- Garantir que `createInstitutionalCategory` e `updateInstitutionalCategory` suportem o campo `image_url`.
- Atualizar `registerUserWithType` e `updateMyPartnerProfile` para salvar `store_category_id`.

---

### [Componente] Painel Administrativo

#### [MODIFY] [AdminStoreCategories.tsx](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/components/AdminStoreCategories.tsx)
- Adicionar funcionalidade de upload de imagem no modal de criação/edição de categoria.
- Exibir miniatura da imagem na listagem e no modal.

---

### [Componente] Cadastro e Configurações da Loja

#### [MODIFY] [AuthWrapper.tsx](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/components/AuthWrapper.tsx)
- Adicionar campo de seleção de categoria (usando `CustomSelect`) no formulário de cadastro de lojista.

#### [MODIFY] [StoreSettings.tsx](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/components/StoreSettings.tsx)
- Adicionar campo de seleção de categoria nas configurações básicas da loja.

---

### [Componente] Página da Cidade

#### [MODIFY] [CityStoresList.tsx](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/components/CityStoresList.tsx)
- Implementar carrossel de categorias no topo da página.
- Cada card deve exibir a imagem e o nome da categoria.
- Adicionar botões de navegação lateral (< e >) para o carrossel.

## Plano de Verificação

### Testes Manuais
- [ ] Criar uma nova categoria no Painel Admin e fazer upload de uma imagem.
- [ ] Realizar um novo cadastro de lojista selecionando uma categoria.
- [ ] Alterar a categoria de uma loja existente nas configurações.
- [ ] Acessar a página de uma cidade e verificar se o carrossel de categorias é exibido corretamente com imagens e navegação.
ítulos e preços.

## Detalhes Técnicos
- Utilizar `FileReader` para pré-visualização instantânea de logos e fundos carregados.
- Atualizar `CatalogSettings` para persistir os caminhos/base64 das imagens.
- Ajustar o CSS do rodapé no `PrintCatalogGenerator`.

## Arquivos Afetados
*   `components/DigitalMenu/DigitalMenu.tsx`

## Passos de Implementação
- [ ] Ler `DigitalMenu.tsx` para identificar o bloco de renderização das abas.
- [ ] Implementar lógica derivada para `isDeliveryAvailable` e `isPickupAvailable`.
- [ ] Alterar a UI das abas para renderizar apenas se ambas estiverem disponíveis, ou mostrar um indicador estático se apenas uma estiver.
- [ ] Verificar a lógica de inicialização do estado `deliveryType`.
