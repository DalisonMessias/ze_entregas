# Lista de Tarefas - Aba de Adicionais com IA

## Frontend - StoreCatalog.tsx
- [ ] Criar função `handleEditAddonGroupFromAI` que abre o `AddonModal`.
- [ ] Passar `onEditAddonGroup` para o componente `StoreAIGenerator`.
- [ ] Gerenciar callback de salvamento para remover items da lista pendente da IA (similar ao que foi feito com produtos).

## Frontend - StoreAIGenerator.tsx
- [ ] Atualizar interface `StoreAIGeneratorProps` para receber `onEditAddonGroup`.
- [ ] Adicionar 'addons' ao tipo `GeneratorMode` e ao state `generatorMode`.
- [ ] Adicionar botão "Adicionais" na navegação do componente.
- [ ] Criar prompt específico para gerar JSON de `StoreAddonGroup` (nome, tipo, min, max, opções).
- [ ] Implementar `handleSendAddonsMessage` para processar o prompt.
- [ ] Implementar renderização dos cards de sugestão de grupos de adicionais.
- [ ] Implementar `handleApproveAddonGroup` usando `cloud.createStoreAddonGroup`.

## Verificação
- [ ] Testar geração de grupos de adicionais (ex: "Crie adicionais para Burger").
- [ ] Testar edição via Modal.
- [ ] Testar salvamento e persistência.