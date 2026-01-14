# Configuração e Teste: InfinitePay

Este guia orienta como configurar a integração da InfinitePay utilizando o Infinite Tag (Handle).

## 1. Configurar Infinite Tag (Handle)

A integração utiliza o link de pagamento público (Infinite Link), que não requer Chave de API, apenas o seu identificador único.

**Passo 1:** Obtenha sua Infinite Tag (Handle) no App ou Painel da InfinitePay (ex: `@sualoja`).

**Passo 2:** Configure no Admin do Sistema.
1. Acesse o painel administrativo: `/admin/infinitepay`.
2. Insira sua Tag no campo **Infinite Tag (Handle)**.
3. (Opcional) Configure o **Webhook Secret** se desejar validar as assinaturas das notificações.
4. Salve as configurações.

Isso salvará suas credenciais na tabela `api_keys` do banco de dados de forma segura.

## 2. Testar Geração de Link (Simulação)

Para testar se a função `infinitepay-checkout` está gerando links corretamente:

**Rota:** `https://<seu-projeto>.supabase.co/functions/v1/infinitepay-checkout`
**Método:** `POST`
**Header:** `Authorization: Bearer <seu-anon-key-ou-service-role>`
**Body (JSON):**
```json
{
  "amount": 10.50,
  "order_id": "teste-001",
  "handle": "ze-entregas-recarga",
  "items": [],
  "redirect_url": "https://zeentregas.com/sucesso",
  "webhook_url": "https://zeentregas.com/api/webhook"
}
```
*Nota: Se o `handle` for omitido no JSON, o sistema usará o configured no Admin.*

## 3. Testar Webhook (Simulação)

Para verificar se o sistema processa pagamentos via Webhook:

**Rota:** `https://<seu-projeto>.supabase.co/functions/v1/infinitepay-webhook`
**Método:** `POST`
**Body (JSON) - Exemplo de Pagamento Aprovado:**
```json
{
  "event": "transaction.status_changed",
  "data": {
    "id": "transacao_123",
    "attributes": {
        "amount": 1050,
        "status": "paid",
        "metadata": {
            "user_id": "ID_DO_USUARIO_NO_SEU_BANCO" 
        },
        "order_id": "teste-001"
    }
  }
}
```
*Nota: Substitua `ID_DO_USUARIO_NO_SEU_BANCO` por um ID real (`uuid`) de um usuário existente para testar o crédito.*

## Resolução de Problemas

- **Erro "Configuration Error: InfinitePay Handle not found":** Verifique se você salvou o Handle no painel admin ou se ele está sendo enviado no payload.
