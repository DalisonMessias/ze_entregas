# SaaS WhatsBot - Technical Blueprint (Full Independent System)

Este documento descreve a arquitetura de um sistema **SaaS (Software as a Service)** avançado focado em automação de WhatsApp, incluindo autenticação, gestão de assinaturas, painel administrativo e recursos de marketing inteligente.

---

## 1. Módulos do Sistema
O sistema opera de forma autônoma para o assinante e extensível para o administrador:
- **Auth (Frontend + Backend)**: Cadastro, Login, Logout e Recuperação de Senha via Supabase Auth.
# Blueprint Técnico: WhatsBot SaaS Ready 🚀🤖

Este documento serve como guia mestre para a replicação do WhatsBot em novos projetos independentes.

---

## 1. Arquitetura de Dados (Supabase/PostgreSQL)

Para que o bot funcione com todas as novas funcionalidades, a estrutura de banco de dados deve seguir este padrão:

### Tabela: `whatsbot_settings`
Armazena as configurações globais de cada instância do bot:
- `store_id` (UUID, Primary Key)
- `enabled` (Boolean): Status geral (Ligado/Desligado)
- `custom_message` (Text): Mensagem de boas-vindas (loja aberta)
- `custom_closed_message` (Text): Mensagem de boas-vindas (loja fechada)
- `image_url` / `closed_image_url` (Text): Imagens de acompanhamento
- `ai_enabled` (Boolean): **[NOVO]** Ativação do Assistente de IA
- `ai_context` (Text): **[NOVO]** Diretrizes de personalidade da IA

### Tabela: `whatsbot_triggers`
Armazena as auto-respostas baseadas em palavras-chave:
- `id` (UUID, Primary Key)
- `store_id` (UUID, FK)
- `keyword` (Text): Palavra que dispara o bot
- `response` (Text): Resposta correspondente
- `is_active` (Boolean): Status do gatilho

---

## 2. Hierarquia Inteligente de Resposta

O backend deve processar as mensagens recebidas seguindo esta ordem de prioridade:

1.  **Gatilhos Reativos (Keywords)**: Se a mensagem contiver uma palavra cadastrada em `whatsbot_triggers`, o bot responde e encerra o fluxo imediatamente. (Ignora Anti-spam).
2.  **Assistente de IA (Gemini)**: Se não houver gatilho E `ai_enabled` for verdadeiro, a mensagem é enviada ao LLM com o `ai_context`. O bot responde e encerra o fluxo. (Ignora Anti-spam).
3.  **Mensagem de Boas-vindas Padrão**: Se nenhum dos itens acima for atendido, envia a mensagem de boas-vindas fixa da loja, respeitando a regra de **Não disparar mais de 1 vez por dia para o mesmo contato**.

---

## 3. Variáveis Dinâmicas Inteligentes

Tanto nas respostas da IA quanto nos Gatilhos e Boas-vindas, as seguintes tags devem ser processadas:
- `{{saudacao}}`: Substitui por Bom dia, Boa tarde ou Boa noite conforme o horário local.
- `{{first_name}}`: Extrai e injeta o primeiro nome do contato do WhatsApp.
- `{{catalog_url}}`: Injeta o link público da loja/catálogo.

---

## 4. Interface de Controle (UX/UI)

Para garantir uma boa experiência ao lojista:
- **Salvamento Independente**: O módulo de IA deve possuir seu próprio botão de salvar. Isso permite ajustes rápidos na "personalidade" do bot sem recarregar o restante das configurações.
- **Preview em Tempo Real**: Mostrar como a mensagem aparecerá para o cliente final.
- **Switch Switch**: Usar componentes do tipo 'Switch' para todas as ativações (Bot, IA, Gatilhos).

---

## 5. Proteção Anti-Spam (Marketing Seguro)
- **Rate Limit**: Disparos de campanhas em massa devem ser processados em lotes e em segundo plano.
- **Frequência Reativa**: Mensagens automáticas iniciadas pelo cliente devem sempre ter prioridade sobre mensagens de marketing.
- `{{saudacao}}`: Substituída por "Bom dia", "Boa tarde" ou "Boa noite" baseado no horário real do envio.
- `{{first_name}}`: Extrai apenas a primeira palavra do nome do contato para uma abordagem mais pessoal.

---

Recomendado usar **Supabase (Postgres)** com controle de acesso (RLS):

| Tabela | Colunas Principais |
| :--- | :--- |
| `profiles` | `id, email, role (admin/user), created_at` |
| `subscriptions` | `user_id, plan_name, price, expired_at, status` |
| `whatsbot_triggers` | `id, user_id, keyword, response, is_active` |
| `whatsbot_campaigns` | `id, user_id, name, scheduled_at, status, total_recipients` |

---

## 4. Lógicas Críticas de Frontend

### A. Otimização de Imagens
Toda imagem de campanha deve ser comprimida no frontend (Canvas, JPEG 0.7, 1024px) para acelerar o disparo e economizar servidor.

### B. Harmonização com IA (Gemini)
A IA atua como revisora ortográfica e persuasiva, garantindo que em campanhas não haja duplicação de links (removendo tags redundantes).

---

## 5. Prompt Master para Replicação (O SaaS Final Premium)

> "Crie um SaaS robusto de automação de WhatsApp utilizando React.js e Supabase.
> 
> REQUISITOS OBRIGATÓRIOS:
> 1. **Autenticação**: Páginas profissionais de Login e Cadastro com roles (admin e user).
> 2. **Gatilhos Automáticos**: Crie uma área de 'Auto-respostas' onde eu possa definir palavras-chave (ex: 'Preço') e a resposta automática do Bot.
> 3. **Agendamento Pró**: No modal de 'Nova Campanha', inclua um seletor de data e hora para programar disparos futuros.
> 4. **Variáveis Inteligentes**: Permita o uso das tags {{saudacao}} e {{first_name}} nas mensagens, substituindo-as dinamicamente conforme o contexto.
> 5. **Gestão de Assinaturas e Admin**: Painel completo para o admin gerenciar usuários, planos e datas de validade.
> 6. **Performance**: Comprima imagens no frontend e use polling de 5s para o QR Code."

---
