# Documentação da Integração Mercado Pago - Zé Entregas

Este documento detalha o estado atual da implementação da API do Mercado Pago no sistema Zé Entregas. Ele serve como guia técnico para desenvolvedores na manutenção, depuração e evolução da integração.

---

## 1. Visão Geral

A integração funciona como um módulo dentro do serviço de gateways de pagamento (`services/paymentGateway.ts`). O sistema é projetado para suportar múltiplos gateways e seleciona o provedor ativo baseando-se nas configurações do banco de dados (tabela `payment_gateway_settings`).

### Arquivos Principais

| Arquivo | Descrição da Função |
|---|---|
| `services/mercadopago.ts` | **Cliente da API**: Contém as chamadas REST diretas para o Mercado Pago (Create Payment e Check Status). |
| `services/paymentGateway.ts` | **Orquestrador**: Decide qual gateway utilizar (Lógica de Primary/Fallback) e padroniza as respostas. |
| `components/AdminMercadoPagoConfig.tsx` | **Interface Admin**: Tela para o usuário salvar o `AccessToken` e visualizar a URL do Webhook. |
| `components/ZePayStoreModule.tsx` | **Frontend**: Exemplo de implementação que inicia o fluxo de pagamento e exibe o QR Code. |

---

## 2. Configuração e Credenciais

Para que a integração funcione, as seguintes credenciais são necessárias em ambiente de produção.

1.  **Access Token**: Deve ser uma credencial de **Produção** (inicia com `APP_USR-...`). Credenciais de teste podem não funcionar para geração real de PIX em algumas contas.
2.  **Configuração no Banco**: As credenciais são salvas no banco de dados Supabase na tabela `payment_gateway_settings` onde `gateway_name = 'mercadopago'`.

> **Link Oficial**: [Como obter credenciais](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials)

---

## 3. Fluxo de Pagamento (PIX)

O fluxo implementado é para pagamentos instantâneos via PIX (QR Code).

### 3.1. Iniciação do Pagamento
Quando o usuário solicita uma recarga no sistema:

1.  O frontend invoca `generatePaymentQRCode` em `services/paymentGateway.ts`.
2.  O sistema identifica o Mercado Pago como gateway ativo.
3.  É feita uma chamada `POST` para a API do Mercado Pago.

**Endpoint Utilizado:**
`POST https://api.mercadopago.com/v1/payments`

**Payload Enviado (Exemplo):**
```json
{
    "transaction_amount": 15.50,
    "payment_method_id": "pix",
    "description": "Recarga Zé Entregas",
    "payer": {
        "email": "cliente@email.com",
        "first_name": "Nome",
        "last_name": "Sobrenome"
    },
    "metadata": {
        "user_id": "uuid-do-usuario",
        "type": "zepay_recharge"
    }
}
```

### 3.2. Exibição do QR Code
A API retorna um objeto contendo o QR Code em Base64 e em texto (Copy & Paste).
- O campo `point_of_interaction.transaction_data.qr_code` é extraído e exibido na tela para o usuário.

### 3.3. Confirmação do Pagamento
Atualmente, o sistema utiliza duas estratégias para confirmar o pagamento:

1.  **Polling (Frontend)**: Enquanto o modal está aberto, o navegador consulta a API a cada 5 segundos para verificar se o status mudou para `approved`.
2.  **Webhook (Backend)**: Uma URL é fornecida para o Mercado Pago notificar o sistema passivamente.

---

## 4. Webhooks (Notificações)

**⚠️ PONTO DE ATENÇÃO CRÍTICO**: O código fonte da função de webhook (`mercadopago-webhook`) **não foi encontrado** nos arquivos locais do projeto (`supabase/functions/`). Embora a URL esteja configurada na interface administrativa, a ausência do código sugere que a confirmação assíncrona pode não estar funcionando se o usuário fechar a tela.

### 4.1. Configuração do Webhook
Para garantir o recebimento das notificações, acesse o painel do Mercado Pago e configure a seguinte URL para eventos de `payment`:

**URL do Webhook:**
`https://pjnxrqemjozlpnvoxpmn.supabase.co/functions/v1/mercadopago-webhook`

> **Link Oficial**: [Documentação de Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)

### 4.2. Formato da Notificação (Exemplo)
O Mercado Pago envia um `POST` com o ID do pagamento que sofreu alteração.

```json
{
    "action": "payment.updated",
    "api_version": "v1",
    "data": {
        "id": "123456789"
    },
    "date_created": "2023-01-29T10:00:00Z",
    "id": 123456,
    "live_mode": true,
    "type": "payment",
    "user_id": "00000000"
}
```

### 4.3. Sugestão de Implementação (Edge Function)
Como o arquivo não existe localmente, abaixo está um **exemplo de como a Edge Function deve ser implementada** para processar corretamente o webhook:

```typescript
// Exemplo de implementação para supabase/functions/mercadopago-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.json()
    
    // 1. Validar se é uma notificação de pagamento
    if (body.type === 'payment' || body.action === 'payment.updated') {
      const paymentId = body.data.id;
      
      // 2. Consultar status atualizado na API do Mercado Pago
      // Nota: É crucial consultar a API para confirmar o status real, não confiar apenas no webhook.
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}` }
      });
      const paymentData = await mpResponse.json();
      
      // 3. Atualizar no banco de dados se aprovado
      if (paymentData.status === 'approved') {
         // Lógica para creditar saldo ao usuário
         // UPDATE transactions SET status = 'paid'...
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
```

---

## 5. Troubleshooting (Resolução de Problemas)

### Erro: "Access Token não configurado"
**Sintoma**: O sistema retorna erro imediato ao tentar gerar o QR Code.
**Causa**: O campo `accessToken` está vazio no JSON de credenciais no banco de dados.
**Solução**:
1. Acesse o Painel Admin > Configurações > Mercado Pago.
2. Insira o Access Token de Produção.
3. Salve e tente novamente.

### Erro: "Mercado Pago: QR Code não retornado na resposta"
**Sintoma**: O sistema conecta ao Mercado Pago, mas falha ao exibir o código.
**Causa Possíveis**:
1. **Valor Inválido**: O valor da transação é muito baixo ou inválido.
2. **Conta de Teste**: Usar credenciais de Sandbox pode gerar pagamentos que não retornam QR Code visualizável dependendo da configuração.
3. **E-mail do Pagador**: O e-mail enviado no `payer.email` é o mesmo da conta recebedora (Mercado Pago bloqueia auto-pagamentos).
**Solução**: Use um e-mail de pagador diferente do e-mail da conta Mercado Pago e certifique-se de usar credenciais de Produção.

### Pagamento aprovado no banco, mas não no sistema Zé Entregas
**Sintoma**: Cliente pagou, dinheiro saiu da conta, mas o saldo no app não subiu.
**Causa**: Falha no polling (usuário fechou a tela) E falha no Webhook (código inexistente ou erro 500).
**Solução**:
1. Verificar logs do Supabase para ver se o webhook foi chamado.
2. **PRIORIDADE**: Implementar/Restaurar a Edge Function `mercadopago-webhook`.
3. Manualmente verificar a transação pelo ID no painel do Mercado Pago.

---

## 6. Links Úteis Oficiais

*   [Referência da API de Pagamentos](https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post)
*   [Tipos de Pagamento e Status](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks#status-de-pagamento)
*   [Erros Comuns de Integração](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/support/error-messages)

---

**Última Atualização**: 29/01/2026
**Responsável**: Agente Gemini (Antigravity)
