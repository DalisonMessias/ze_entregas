# Documentação: Sistema de URLs Amigáveis para Cardápio Digital

Este documento define o padrão de URLs amigáveis para a funcionalidade futura de **Cardápio Digital** da plataforma **Zê Entregas**.

## 1. Estrutura da URL
O objetivo é permitir que cada loja tenha um link único e profissional que possa ser impresso em QR Codes ou compartilhado em redes sociais.

**Padrão Sugerido:**
`https://zeentregas.com/{cidade_slug}/{loja_slug}`

**Exemplo:**
`https://zeentregas.com/sao-paulo/pizzaria-do-ze`

---

## 2. Requisitos de Banco de Dados
Para suportar esta estrutura, a tabela `user_profiles` deve conter os seguintes campos:

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `store_slug` | TEXT | Nome da loja formatado para URL (ex: `pizzaria-do-ze`). Deve ser único. |
| `city_slug` | TEXT | Nome da cidade formatado para URL (ex: `sao-paulo`). |
| `role` | user_role | Deve ser definido como `user` para clientes finais que acessam o cardápio. |

---

## 3. Lógica de Redirecionamento (Futuro)
Quando um usuário acessar a URL, o sistema deverá:

1. Extrair a `cidade_slug` e a `loja_slug` da URL.
2. Buscar no banco de dados o `user_id` correspondente que possua esse par de slugs.
3. Se encontrado, carregar o componente de **Cardápio Digital** filtrando pelos produtos daquela `store_id`.
4. Se não encontrado, redirecionar para uma página de "Loja não encontrada" ou para a home da cidade.

---

## 4. Geração de QR Code
O QR Code gerado na plataforma deverá apontar diretamente para esta URL amigável, garantindo que o cliente acesse o cardápio correto ao escanear a etiqueta na mesa.

---

## 5. Próximos Passos Técnicos
- [ ] Implementar trigger para gerar `store_slug` automaticamente a partir do `store_name`.
- [ ] Implementar trigger para gerar `city_slug` automaticamente a partir do `city`.
- [ ] Criar middleware de roteamento no Next.js/Vite para tratar as rotas dinâmicas.

---
**Nota:** Esta funcionalidade está planejada para fases futuras da plataforma.
