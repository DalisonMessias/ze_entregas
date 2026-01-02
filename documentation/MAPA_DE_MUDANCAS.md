# 🎯 MAPA DE MUDANÇAS - StoreRequest.tsx

## Localização Visual das Alterações

```
components/StoreRequest.tsx
│
├─ LINHAS 1-30: Imports (sem mudanças)
│
├─ LINHAS 30-60: Export e Estado
│   │
│   ├─ Linha 35-56: Estados existentes (sem mudanças)
│   │   const [loading, setLoading] = useState(...)
│   │   const [fees, setFees] = useState(...)
│   │   ...
│   │
│   └─ ⭐ LINHAS 58-60: NOVOS ESTADOS
│       const [expiresCountdown, setExpiresCountdown] = useState(...)
│       const [expiresTimer, setExpiresTimer] = useState(...)
│       const [currentRequestId, setCurrentRequestId] = useState(...)  ← NOVO!
│
├─ LINHAS 61-140: useEffect initial (sem mudanças)
│
├─ LINHAS 140-165: useEffect requestType
│   │
│   └─ ⭐ LINHAS 157-163: NOVO useEffect (cleanup)
│       useEffect(() => {
│           return () => {
│               if (expiresTimer) {
│                   clearInterval(expiresTimer);
│               }
│           };
│       }, [expiresTimer]);
│
├─ LINHAS 165-400: Handlers e funções auxiliares
│   │
│   ├─ handleSelectPlatform (sem mudanças)
│   ├─ addDelivery (sem mudanças)
│   ├─ formatAddressString (sem mudanças)
│   ├─ handleDispatch (sem mudanças)
│   │
│   └─ ⭐ LINHAS 390: MUDANÇA EM handleDispatch
│       if (result.requestId) {
│           startCountdown(result.expiresAt, result.requestId);  ← ADICIONAR requestId
│       }
│
├─ LINHAS 400-460: Handlers continuação
│   │
│   ├─ confirmLoanAndDispatch (linhas 425-465)
│   │   │
│   │   └─ ⭐ LINHA 459: MUDANÇA EM confirmLoanAndDispatch
│   │       if (result.requestId) {
│   │           startCountdown(result.expiresAt, result.requestId);  ← ADICIONAR requestId
│   │       }
│   │
│   └─ ⭐ LINHAS 413-451: FUNÇÃO REESCRITA
│       const startCountdown = (expiresAt?: string, requestId?: string) => {
│           if (!expiresAt || !requestId) return;
│           
│           setCurrentRequestId(requestId);
│           
│           try {
│               const end = new Date(expiresAt).getTime();
│               const update = async () => {
│                   const now = Date.now();
│                   const diff = Math.max(0, Math.floor((end - now) / 1000));
│                   setExpiresCountdown(diff);
│                   
│                   if (diff <= 0) {
│                       if (expiresTimer) {
│                           clearInterval(expiresTimer);
│                           setExpiresTimer(null);
│                       }
│                       try {
│                           await cloud.autoCancelUnacceptedRequest(requestId);  ← KEY LINE
│                           setNotification({ 
│                               type: 'info', 
│                               message: 'Entrega cancelada...'
│                           });
│                           setCurrentRequestId(null);
│                           setExpiresCountdown(null);
│                       } catch (err: any) {
│                           console.error('Erro...', err);
│                           setNotification({ type: 'error', message: '...' });
│                       }
│                   }
│               };
│               update();
│               const id = setInterval(update, 1000);
│               setExpiresTimer(id);
│           } catch {}
│       };
│
├─ LINHAS 460-680: JSX de renderização (sem mudanças)
│   └─ Apenas exibe o countdown que agora funciona!
│
└─ LINHAS 680-711: Fecha componente (sem mudanças)
```

---

## 📍 5 Pontos de Mudança

### PONTO 1: Novos Estados (Linhas 58-60)

```typescript
// ⭐ ADICIONADO
const [expiresCountdown, setExpiresCountdown] = useState<number | null>(null);
const [expiresTimer, setExpiresTimer] = useState<any>(null);
const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
```

**O quê:** Armazenar ID da entrega para cancelamento  
**Por quê:** Precisa saber qual entrega cancelar  
**Onde:** Logo após outros estados do componente

---

### PONTO 2: Hook de Cleanup (Linhas 157-163)

```typescript
// ⭐ ADICIONADO
useEffect(() => {
    return () => {
        if (expiresTimer) {
            clearInterval(expiresTimer);
        }
    };
}, [expiresTimer]);
```

**O quê:** Limpar timer ao desmontar componente  
**Por quê:** Evitar memory leak  
**Onde:** Após o useEffect de requestType

---

### PONTO 3: Reescrita de startCountdown (Linhas 413-451)

```typescript
// ❌ ANTES (Linhas 407-423)
const startCountdown = (expiresAt?: string) => {
    if (!expiresAt) return;
    try {
        const end = new Date(expiresAt).getTime();
        const update = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((end - now) / 1000));
            setExpiresCountdown(diff);
            if (diff <= 0 && expiresTimer) {
                clearInterval(expiresTimer);
            }
        };
        update();
        const id = setInterval(update, 1000);
        setExpiresTimer(id);
    } catch {}
};

// ✅ DEPOIS (Linhas 413-451)
const startCountdown = (expiresAt?: string, requestId?: string) => {
    if (!expiresAt || !requestId) return;  // ← Novo param
    
    setCurrentRequestId(requestId);  // ← Armazenar ID
    
    try {
        const end = new Date(expiresAt).getTime();
        const update = async () => {  // ← Agora async
            const now = Date.now();
            const diff = Math.max(0, Math.floor((end - now) / 1000));
            setExpiresCountdown(diff);
            
            // ← NOVO: Ação quando expira
            if (diff <= 0) {
                if (expiresTimer) {
                    clearInterval(expiresTimer);
                    setExpiresTimer(null);
                }
                try {
                    await cloud.autoCancelUnacceptedRequest(requestId);  // ← PRINCIPAL MUDANÇA
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

**O quê:** Adicionar lógica de cancelamento ao timeout  
**Por quê:** Executar ação quando timer expira  
**Onde:** Logo após handlers de confirmação

---

### PONTO 4: Primeira Chamada com requestId (Linha 390)

```typescript
// ❌ ANTES
if (result.requestId) {
    startCountdown(result.expiresAt);
}

// ✅ DEPOIS
if (result.requestId) {
    startCountdown(result.expiresAt, result.requestId);  // ← Adicionar requestId
}
```

**O quê:** Passar ID da entrega para timer  
**Por quê:** Timer precisa saber qual entrega cancelar  
**Onde:** Em handleDispatch, após criar request

---

### PONTO 5: Segunda Chamada com requestId (Linha 459)

```typescript
// ❌ ANTES
if (result.requestId) {
    startCountdown(result.expiresAt);
}

// ✅ DEPOIS
if (result.requestId) {
    startCountdown(result.expiresAt, result.requestId);  // ← Adicionar requestId
}
```

**O quê:** Passar ID para timer em confirmLoanAndDispatch  
**Por quê:** Mesmo motivo do Ponto 4  
**Onde:** Em confirmLoanAndDispatch, após criar request com empréstimo

---

## 📊 Resumo Visual

```
StoreRequest.tsx (711 linhas)

┌─────────────────────────────────┐
│ ANTES: Nada novo                 │
├─────────────────────────────────┤
│ Linhas 1-407: Normal            │
│ Linhas 407-423: startCountdown  │  ← Timer contava apenas
│ Linhas 424-711: Normal          │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ DEPOIS: 5 mudanças              │
├─────────────────────────────────┤
│ Linhas 1-57: Normal             │
│ ⭐ Linhas 58-60: Novos estados │
│ Linhas 61-156: Normal           │
│ ⭐ Linhas 157-163: Cleanup      │
│ Linhas 164-389: Normal          │
│ ⭐ Linha 390: requestId adicionado
│ Linhas 391-412: Normal          │
│ ⭐ Linhas 413-451: startCountdown reescrita
│ Linhas 452-458: Normal          │
│ ⭐ Linha 459: requestId adicionado
│ Linhas 460-711: Normal          │
└─────────────────────────────────┘
```

---

## 🔄 Fluxo de Execução Através das Mudanças

```
1. Usuário clica "Solicitar"
   ↓
2. handleDispatch() executado
   ├─ createPartnerRequest() retorna result
   ├─ ⭐ PONTO 4: startCountdown(expiresAt, requestId) chamado
   │  ↓
3. startCountdown() executado
   ├─ ⭐ PONTO 1: currentRequestId armazenado
   ├─ Timer de 5:00 até 0:00 inicia
   │  ↓
4. Timer contando: 4:59, 4:58, 4:57, ...
   │  ↓
5. Timer chega a 0:00
   ├─ ⭐ PONTO 3 (parte if): Executa ação
   ├─ autoCancelUnacceptedRequest(requestId) chamado
   ├─ Supabase processa
   ├─ Notificação exibida
   │  ↓
6. Usuário navega para outra página
   ├─ ⭐ PONTO 2: useEffect cleanup executado
   ├─ clearInterval(expiresTimer) chamado
   ├─ Sem memory leak!
   │  ↓
7. Histórico mostra: CANCELLED
```

---

## 🎨 Visualização de Código

### Antes (❌ Quebrado)

```
Request          Frontend              Backend
│                  │                      │
├─ createRequest  │                      │
│    ├──────────────────────────────────┤
│    │                                   │
│    │◄──── { requestId, expiresAt }   │
│                                        │
│    startCountdown(expiresAt)           │
│    Timer: 5:00 → 0:00                  │
│    ❌ Nada acontece ao chegar a 0:00  │
│    │
│    Entrega fica PENDING forever 😞
```

### Depois (✅ Correto)

```
Request          Frontend              Backend
│                  │                      │
├─ createRequest  │                      │
│    ├──────────────────────────────────┤
│    │                                   │
│    │◄──── { requestId, expiresAt }   │
│                                        │
│    startCountdown(expiresAt, requestId)
│    Timer: 5:00 → 0:00                  │
│    ✅ await autoCancelUnacceptedRequest(requestId)
│         ├──────────────────────────────┤
│         │                              │
│         │ UPDATE + INSERT + REFUND    │
│         │                              │
│    Entrega fica CANCELLED ✨
│    Saldo reembolsado ✨
```

---

## 🧪 Onde Testar Cada Mudança

| Mudança | Onde Testar | Como Validar |
|---------|-------------|--------------|
| Ponto 1 | DevTools → React | `currentRequestId` tem valor |
| Ponto 2 | Sair da página | Sem warnings no console |
| Ponto 3 | Timer em 0:00 | `autoCancelUnacceptedRequest` é chamado |
| Ponto 4 | handleDispatch | `requestId` é passado para função |
| Ponto 5 | confirmLoanAndDispatch | `requestId` é passado para função |

---

## ✅ Validação de Mudanças

```bash
# Verificar que arquivo foi modificado corretamente
grep -n "currentRequestId" components/StoreRequest.tsx
# Esperado: 3 linhas (declaração + 2 usos)

# Verificar cleanup hook
grep -n "clearInterval(expiresTimer)" components/StoreRequest.tsx
# Esperado: 2 linhas (no cleanup e no timeout)

# Verificar chamadas com requestId
grep -n "startCountdown.*requestId" components/StoreRequest.tsx
# Esperado: 2 linhas (2 chamadas)

# Verificar function async
grep -n "async () => {" components/StoreRequest.tsx | grep -A5 startCountdown
# Esperado: update function é async
```

---

## 🎯 TL;DR (Resumo Muito Rápido)

**5 mudanças em 1 arquivo:**

1. **Linha 60:** `const [currentRequestId, ...] = useState(null)`
2. **Linha 160:** `useEffect(() => { clearInterval(...) }, ...)`
3. **Linha 390:** `startCountdown(..., result.requestId)`
4. **Linha 413-451:** Reescrever `startCountdown` com `if (diff <= 0) await cancel()`
5. **Linha 459:** `startCountdown(..., result.requestId)`

**Boom. Done. 💥**
