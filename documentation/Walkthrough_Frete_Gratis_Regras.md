# Walkthrough - Funcionalidades de Frete Grátis e Regras

## Novas Funcionalidades

### 1. Menu Digital (Cliente Final)

*   **Modal de Normas de Entrega:**
    *   Clicar no link **"(Ver normas)"** ao lado de "Grátis*" agora abre uma janela (`ShippingRulesModal`) listando as condições para isenção de taxa (ex: "Frete Grátis acima de R$ 50,00").
    *   Isso garante transparência ao cliente sobre por que a entrega é gratuita ou quais regras se aplicam.

*   **Indicador "Grátis*":**
    *   O texto "Grátis*" com o link de normas aparece apenas se a taxa de entrega for calculada como R$ 0,00.

### 2. Configurações da Loja (Lojista)

*   **Ativação de Entregas Grátis (Novo Recurso):**
    *   Adicionada uma seção visualmente destacada (banner "Fidelidade") em **Configurações de Loja > Opções de Entrega**.
    *   Esta seção contém um botão **"Configurar Regras"** que rola a página automaticamente até a área de cadastro de regras (onde o lojista define valor mínimo, taxas fixas, etc.), atendendo à solicitação de clareza sobre onde "ativar" essa função.

## Detalhes Técnicos

*   **Componentes Criados/Alterados:**
    *   `ShippingRulesModal.tsx`: Novo componente para exibição das regras.
    *   `DigitalMenu.tsx`: Integração do modal e lógica de clique.
    *   `StoreDeliverySettings.tsx`: Adição da seção de call-to-action para regras.
    *   `StoreShippingRules.tsx`: Adição de ID para âncora de navegação suave.

## Como Testar

1.  **Visão Cliente:**
    *   Adicione produtos ao carrinho até atingir uma regra de frete grátis (se houver).
    *   Verifique se aparece "Grátis* (Ver normas)".
    *   Clique em "(Ver normas)" e confirme se o modal abre listando a regra.

2.  **Visão Lojista:**
    *   Vá em Configurações > Config. Frete.
    *   Localize o banner "Entrega Grátis Condicional".
    *   Clique em "Configurar Regras" e verifique se a página rola até a seção de cadastro de regras.
