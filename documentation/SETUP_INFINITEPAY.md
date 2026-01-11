# Configuração e Teste: InfinitePay

Este guia orienta como configurar as credenciais necessárias para a integração da InfinitePay funcionar e como testar o fluxo.

## 1. Configurar Chaves de API (Supabase Secrets)

As Edge Functions do Supabase precisam acessar a chave da API da InfinitePay de forma segura.

**Passo 1:** Obtenha sua `API Key` no painel da InfinitePay (Modo Produção ou Sandbox).

**Passo 2:** Configure no Supabase.
Você pode fazer isso rodando o comando no terminal (se tiver a CLI instalada) ou via Dashboard do Supabase.

**Via Dashboard (Recomendado):**
1. Vá em **Project Settings** > **Edge Functions**.
2. Adicione um novo segredo chamado `INFINITEPAY_API_KEY`.
3. Cole sua chave da InfinitePay como valor.

**Via CLI (Se disponível):**
```bash
npx supabase secrets set INFINITEPAY_API_KEY=sua_chave_aqui
```

## 2. Testar Geração de Link (Simulação)

Para testar se a função `infinitepay-checkout` está gerando links corretamente, você pode usar o painel do Supabase ou o Postman/Insomnia.

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

## 3. Testar Webhook (Simulação)

Para verificar se o sistema processa pagamentos, você pode simular um webhook da InfinitePay enviado para sua função.

**Rota:** `https://<seu-projeto>.supabase.co/functions/v1/infinitepay-webhook`
**Método:** `POST`
**Body (JSON) - Exemplo de Sucesso:**
```json
{
  "event": "transaction.status_changed",
  "data": {
    "id": "transacao_123",
    "attributes": {
        "amount": 1050,
        "status": "paid",
        "metadata": {
            "user_id": "ID_DO_LOJISTA_NO_SEU_BANCO" 
        },
        "order_id": "teste-001"
    }
  }
}
```
*Nota: Substitua `ID_DO_LOJISTA_NO_SEU_BANCO` por um ID real de usuário `store_partner` do seu banco de dados para testar o crédito na carteira.*

## Resolução de Problemas

- **Erros de Deno na IDE:** Se o VS Code mostrar erros vermelhos nos arquivos `.ts` dentro de `supabase/functions`, instale a extensão "Deno" no VS Code e habilite-a para o workspace. Se não quiser instalar, ignore os erros; eles não impedem o funcionamento no servidor Supabase.
