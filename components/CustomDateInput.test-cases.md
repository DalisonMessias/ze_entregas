
# Casos de Teste para o Componente CustomDateInput

Esta é uma lista de cenários de teste para garantir que o componente `CustomDateInput` funcione conforme o esperado.

## 1. Renderização e Exibição

-   **Teste 1.1:** O componente deve renderizar sem erros.
-   **Teste 1.2:** Deve exibir o `label` quando a prop `label` for fornecida.
-   **Teste 1.3:** Deve exibir o `placeholder` quando o valor for nulo ou vazio.
-   **Teste 1.4:** Quando um valor inicial (ISO string ou objeto `Date`) é fornecido, o input deve exibir a data formatada como `DD/MM/AAAA`.
-   **Teste 1.5:** O ícone de calendário deve ser exibido por padrão.
-   **Teste 1.6:** O botão de limpar (`X`) não deve ser visível quando o campo está vazio.
-   **Teste 1.7:** O componente deve renderizar no estado desabilitado (`disabled`) se a prop for verdadeira.

## 2. Interação e Eventos

-   **Teste 2.1:** Digitar uma data válida (`DD/MM/AAAA`) deve acionar a função `onChange` com a data correspondente em formato ISO (`YYYY-MM-DD`).
-   **Teste 2.2:** A máscara de data deve autoformatar a entrada do usuário (ex: `1` -> `1`, `12` -> `12`, `1205` -> `12/05`, `12052024` -> `12/05/2024`).
-   **Teste 2.3:** Clicar no botão de limpar deve apagar o valor do input e chamar `onChange` com `null`.
-   **Teste 2.4:** Digitar uma data parcial (ex: `12/05/`) não deve acionar o `onChange` com um valor final, mas deve atualizar a exibição.
-   **Teste 2.5:** Colar uma data formatada (`DD/MM/AAAA`) no campo deve funcionar corretamente.

## 3. Validação e Erros

-   **Teste 3.1:** Se `required` for verdadeiro e o campo estiver vazio (após uma interação), uma mensagem de erro de campo obrigatório deve ser exibida.
-   **Teste 3.2:** Digitar uma data inválida (ex: `99/99/9999` ou `32/01/2024`) deve exibir uma mensagem de "Data inválida".
-   **Teste 3.3:** Digitar uma data anterior à data `min` deve mostrar uma mensagem de erro de validação.
-   **Teste 3.4:** Digitar uma data posterior à data `max` deve mostrar uma mensagem de erro de validação.
-   **Teste 3.5:** Quando uma prop `error` externa é definida como `true`, o campo deve assumir um estilo de erro.
-   **Teste 3.6:** O `helperText` deve ser exibido, seja ele um texto de ajuda padrão ou uma mensagem de erro.

## 4. Acessibilidade

-   **Teste 4.1:** A `label` deve estar corretamente associada ao `input` através do atributo `htmlFor` e `id`.
-   **Teste 4.2:** O atributo `aria-invalid` deve ser `true` quando houver um erro de validação.
-   **Teste 4.3:** O atributo `aria-describedby` deve apontar para o ID do elemento que contém o `helperText` ou a mensagem de erro.
-   **Teste 4.4:** O componente deve ser navegável e operável utilizando apenas o teclado (Tab para focar, digitar a data, Tab para sair).

## 5. Props Opcionais

-   **Teste 5.1:** Se `showCalendarIcon` for `false`, o ícone de calendário não deve ser renderizado.
-   **Teste 5.2:** Se `allowClear` for `false`, o botão de limpar não deve ser renderizado, mesmo quando há um valor.
-   **Teste 5.3:** A prop `className` deve ser aplicada ao container principal do componente para permitir estilização customizada.
