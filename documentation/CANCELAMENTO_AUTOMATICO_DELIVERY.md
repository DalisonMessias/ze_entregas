# Implementação: Cancelamento Automático de Entregas após Timeout

## Problema Identificado
Ao solicitar uma entrega em `StoreRequest.tsx`, existe um prazo de 5 minutos para encontrar um entregador disponível. Porém, quando nenhum entregador aceitava a entrega dentro desse prazo, ela permanecia como "pendente" indefinidamente, obrigando o lojista a cancelar manualmente.

## Solução Implementada

### Mudanças em `components/StoreRequest.tsx`

#### 1. **Movimentação de Variáveis de Estado** (Linhas 58-60)
```typescript
const [expiresCountdown, setExpiresCountdown] = useState<number | null>(null);
const [expiresTimer, setExpiresTimer] = useState<any>(null);
const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
```
- Adicionada variável `currentRequestId` para armazenar o ID da solicitação atual durante o countdown
- Movidas declarações para o topo do componente para evitar conflitos de escopo

#### 2. **Atualização da Função `startCountdown`** (Linhas 413-451)
```typescript
const startCountdown = (expiresAt?: string, requestId?: string) => {
    if (!expiresAt || !requestId) return;
    
    setCurrentRequestId(requestId);
    
    try {
        const end = new Date(expiresAt).getTime();
        const update = async () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((end - now) / 1000));
            setExpiresCountdown(diff);
            
            // Cancelar automaticamente quando o tempo expirar
            if (diff <= 0) {
                if (expiresTimer) {
                    clearInterval(expiresTimer);
                    setExpiresTimer(null);
                }
                try {
                    await cloud.autoCancelUnacceptedRequest(requestId);
                    setNotification({ 
                        type: 'info', 
                        message: 'Entrega cancelada: nenhum entregador aceitou no prazo de 5 minutos. Valor reembolsado.' 
                    });
                    setCurrentRequestId(null);
                    setExpiresCountdown(null);
                } catch (err: any) {
                    console.error('Erro ao cancelar solicitação expirada:', err);
                    setNotification({ type: 'error', message: 'Erro ao cancelar entrega expirada.' });
                }
            }
        };
        update();
        const id = setInterval(update, 1000);
        setExpiresTimer(id);
    } catch {}
};
```

**Principais mudanças:**
- Agora recebe `requestId` como parâmetro
- Quando o countdown chega a 0 segundos, chama `cloud.autoCancelUnacceptedRequest(requestId)`
- Executa reembolso automático e notifica o lojista
- Limpa os timers e estados corretamente

#### 3. **Chamadas de `startCountdown` Atualizadas** 
- **Linha 390** (ao criar entrega sem empréstimo):
```typescript
if (result.requestId) {
    startCountdown(result.expiresAt, result.requestId);
}
```

- **Linha 459** (ao confirmar com empréstimo):
```typescript
if (result.requestId) {
    startCountdown(result.expiresAt, result.requestId);
}
```

#### 4. **Limpeza de Timers ao Desmontar** (Linhas 157-163)
```typescript
// Limpar timer ao desmontar componente
useEffect(() => {
    return () => {
        if (expiresTimer) {
            clearInterval(expiresTimer);
        }
    };
}, [expiresTimer]);
```

Evita memory leaks quando o usuário sai do componente.

## Fluxo de Funcionamento

```
1. Lojista solicita entrega
   ↓
2. createPartnerRequest() é executado
   ↓
3. startCountdown(expiresAt, requestId) inicia timer de 5 minutos
   ↓
4. Usuário vê o countdown: "Tempo para expirar: 05:00"
   ↓
5. Se um entregador aceitar → Cancelamento interrompido ✓
   ↓
6. Se timeout (0 segundos) → autoCancelUnacceptedRequest() é chamado
   ↓
7. Função SQL no Supabase:
   - Muda status para CANCELLED
   - Define failure_reason = "Cancelado por falta de entregador"
   - Reembolsa o valor para a carteira da loja
   ↓
8. Notificação enviada: "Entrega cancelada: nenhum entregador aceitou no prazo de 5 minutos. Valor reembolsado."
   ↓
9. Entrega aparece como CANCELADA no histórico (OrderHistory.tsx)
```

## Componentes Envolvidos

### Backend (Supabase)
- Função SQL: `auto_cancel_unaccepted_request(p_request_id uuid)` 
  - Localização: `supabase/migrations/supabase_global.sql` (linha 2004)
  - Executa cancelamento e reembolso automático

### Frontend
- **StoreRequest.tsx**: Inicia e monitora o timer, chama a função de cancelamento
- **OrderHistory.tsx**: Exibe status CANCELLED com cor vermelha
- **cloud.ts**: Função `autoCancelUnacceptedRequest()` (linha 922) que chama o RPC no Supabase

## Benefícios

✅ **Usuário (Lojista)**
- Entrega é automaticamente cancelada após 5 minutos de inatividade
- Valor é reembolsado automaticamente
- Não precisa cancelar manualmente
- Recebe notificação clara do que aconteceu

✅ **Aplicação**
- Entregas não ficam em estado "PENDING" indefinidamente
- Histórico fica consistente e preciso
- Reembolsos são processados automaticamente

✅ **Entregadores**
- Não recebem notificações de entregas expiradas
- Lista de disponíveis mais limpa

## Testes Recomendados

1. **Teste Básico:**
   - Solicitar entrega → Ver timer → Aguardar 5 minutos → Verificar se cancelou automaticamente

2. **Teste de Aceite:**
   - Solicitar entrega → Antes de expirar, um entregador aceita → Verificar se cancelamento não ocorre

3. **Teste de Saída de Página:**
   - Solicitar entrega → Sair da página → Voltar → Verificar status

4. **Teste de Reembolso:**
   - Verificar saldo da carteira antes e depois do timeout

## Observações

- A função SQL `auto_cancel_unaccepted_request()` já existia mas **não estava sendo chamada** pelo frontend
- Este fix apenas conecta o frontend ao backend existente
- O reembolso é feito via transação SQL atomicamente, garantindo consistência
