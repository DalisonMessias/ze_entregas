# Melhorias no Catálogo Digital (Menu Público)

## Endereço e Checkout
- [x] Adicionar campo de CEP com busca automática (BrasilAPI).
    - [x] Auto-preenchimento: Bairro, Cidade, Estado.
    - [x] **NÃO** auto-preencher Rua (apenas focar campo?).
- [x] Adicionar campo "Ponto de Referência".
- [x] Adicionar campo "Bairro" (Texto livre) para fallback.
- [x] Substituir Select de Pagamento por **Botões Selecionáveis**.
- [x] Implementar componente `CitySearchSelect` para seleção de cidade (baseado na cidade da loja).
- [x] Implementar componente `CityStreetSelect` para busca de ruas.

## Fluxo de Produto
- [x] Alterar clique no produto: Abre modal de **Preview/Detalhes** (não adiciona direto).
- [x] Adicionar Botão "+" ou ícone de carrinho no **Card do Produto** para adição rápida.
- [x] Adicionar Botão de Adicionar no **Modal de Preview**.

## Visual e UX
- [x] Nome da Loja: Branco com sombra preta (Contraste na capa) / Escuro no Mobile.
- [x] Navegação Mobile: Ajustar layout.
- [x] Fundo abaixo da capa: Branco.
- [x] Comentários (se houver): Sobre o fundo branco.
- [x] Carrossel de Categorias: Design moderno.
- [x] Botão Remover Item (Estilizado).
- [x] Botão Limpar Carrinho.

## Reestruturação de Layout (Novo)
- [ ] Criar **Menu Superior Fixo** (Navbar).
    - [ ] Esquerda: Logo do Zé Entregas (pequeno).
    - [ ] Centro: Barra de Busca de Produtos + Filtro de Categorias.
    - [ ] Direita: Botão de Carrinho (Com contador e valor).
- [ ] Implementar **Filtro de Pesquisa** (Nome do produto).
- [ ] Remover Sidebar lateral "Seu Pedido" (Desktop).
- [ ] Carrinho deve ser sempre um Drawer/Modal acionado pelo botão do topo.
- [ ] Unificar experiência Mobile/Desktop.