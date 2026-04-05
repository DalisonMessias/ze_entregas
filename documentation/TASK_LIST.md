# Lista de Tarefas - Página de Upgrade de Contas Comuns para Modos Operacionais

- [x] Criar componente visual de Frontend (`UpgradeToPartner.tsx`) para usuários simples escolherem se desejam atuar como Motoboy (Entregador) ou Loja Parceira.
- [x] Criar rotina transacional RPG robusta em Banco de Dados no Postgres (`upgrade_user_role`) para processamento livre do gatilho RLS que altere a permissão para o novo cargo.
- [x] Plugar interface no Application Router (`App.tsx`), mapeando a URL/rota `/upgrade` para renderizar perfeitamente substituindo a mensagem de tela não implementada.
