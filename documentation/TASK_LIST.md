# Plano de Tarefas: Implementação de Entregadores Fixos

## Banco de Dados (Supabase)
- [x] Criar tabela `delivery_fixed_assignments` em `supabase_global_part3.sql`.
- [x] Criar tabela `delivery_fixed_schedules` em `supabase_global_part3.sql`.
- [x] Criar tabela `delivery_fixed_logs` em `supabase_global_part3.sql`.
- [x] Criar tabela `delivery_fixed_priorities` em `supabase_global_part3.sql`.
- [x] Criar tabela `delivery_fixed_bonuses` em `supabase_global_part3.sql`.
- [x] Criar tabela `delivery_fixed_statistics` em `supabase_global_part3.sql`.
- [x] Criar tabela `delivery_fixed_history` em `supabase_global_part3.sql`.

## Backend / API (Funções Supabase RPC / API Server)
- [x] Criar endpoints para gerenciar vínculos (criar, atualizar, remover, suspender, reativar).
- [x] Criar endpoints para gerenciar escalas e horários.
- [x] Criar lógica de Distribuição Inteligente (fallback para modo geral caso não haja fixo disponível).
- [x] Criar rotas para estatísticas e relatórios.

## Painel Administrativo
- [x] Criar página/componente `AdminFixedDrivers` para gerenciamento completo.
- [x] Adicionar filtros (loja, cidade, região, entregador, status, tipo).
- [x] Adicionar funcionalidade para definição de ganhos/bônus personalizados por vínculo.
- [x] Integrar no menu lateral do painel de administração.

## Painel da Loja
- [x] Criar área/componente "Meus Entregadores Fixos" (`StoreFixedDrivers`).
- [x] Exibir listagem e status atual de cada entregador (online/offline/entregando).
- [x] Permitir solicitação de novo entregador ou substituição.

## Aplicativo do Entregador
- [x] Criar área/componente "Minhas Lojas Vinculadas" (`DriverFixedStores`).
- [x] Exibir aviso visual de "Entregador Fixo" para os pedidos elegíveis.
- [x] Adicionar visualização de ganhos, escalas e histórico de entregas por loja.

## Notificações e Regras de Negócio
- [x] Implementar Modo Escala com alertas de faltas/atrasos.
- [x] Implementar Modo Descanso (pausa no vínculo).
- [x] Configurar notificações em tempo real (push / database) para admin, lojas e entregadores.

## Validação e Testes
- [x] Testar distribuição inteligente de pedidos com diferentes tipos de vínculo (exclusivo, prioritário, compartilhado).
- [x] Validar compatibilidade com a distribuição geral (fallback).
- [x] Confirmar registros de auditoria e logs.
