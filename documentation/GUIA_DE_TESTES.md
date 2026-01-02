# Guia de Testes - Cancelamento Automático de Entregas

## 📋 Pré-requisitos para Testes

- ✅ Aplicação rodando em `http://localhost:3001`
- ✅ Backend Supabase configurado
- ✅ Conta de lojista autenticada
- ✅ Entregadores cadastrados (para alguns testes)
- ✅ Browser com console aberto (F12)

---

## 🧪 Teste 1: Cancelamento Automático por Timeout (Caso Normal)

### Objetivo
Verificar que uma entrega é cancelada automaticamente após 5 minutos sem aceite.

### Passos

1. **Fazer Login como Lojista**
   - Abrir aplicação
   - Fazer login com conta de lojista
   
2. **Navegar para StoreRequest**
   - Clicar em "Solicitar Entrega" ou similar
   - Ir até `components/StoreRequest.tsx`

3. **Preencher Formulário**
   - Endereço de Coleta: Rua A, número 100, Bairro Centro
   - Endereço de Entrega: Rua B, número 200, Bairro Zona Leste
   - Clicar em "Calcular"
   - Aguardar valores aparecerem

4. **Solicitar Entrega**
   - Clicar em "Chamar Entregador Zé"
   - Anotar o **Código de Entrega** (ex: #1234)
   - ✅ Esperado: Ver mensagem de sucesso

5. **Observar o Timer**
   ```
   ⏱️ Tempo para expirar: 05:00
   ```
   - Ver o countdown diminuindo
   - Anotar a hora inicial (Ex: 14:32:00)

6. **Aguardar 5 minutos**
   - NÃO fazer nada
   - NÃO aceitar a entrega
   - Deixar o timer rodar
   - Tempo: ~5 minutos

7. **Verificar Cancelamento Automático**
   
   **No Console (F12):**
   ```javascript
   // Você verá logs como:
   // "Erro ao cancelar solicitação expirada:" (se houver erro)
   // Ou sucesso silencioso
   ```

   **Na Página:**
   - ✅ Timer desaparece
   - ✅ Notificação aparece em verde/azul:
     ```
     ℹ️ Entrega cancelada: nenhum entregador aceitou no prazo 
        de 5 minutos. Valor reembolsado.
     ```

8. **Verificar Saldo de Carteira**
   - Ir para "Carteira" ou "Meu Saldo"
   - ✅ Saldo deve estar restaurado ao valor anterior

9. **Verificar Histórico**
   - Ir para "Histórico de Entregas" ou `components/OrderHistory.tsx`
   - Procurar pelo código de entrega anotado
   - ✅ Status deve ser: **Cancelado** (em vermelho)
   - ✅ Campo `failure_reason` ou similar deve mostrar:
     ```
     "Cancelado por falta de entregador"
     ```

### ✅ Sucesso esperado
```
Antes:        R$ 100,00  (saldo após solicitação)
Após timeout: R$ 150,00  (saldo restaurado)
Status:       CANCELLED  (em vermelho no histórico)
```

---

## 🧪 Teste 2: Entregador Aceita Antes do Timeout

### Objetivo
Verificar que cancelamento NÃO ocorre se entregador aceitar a tempo.

### Passos

1. **Solicitar Entrega (mesmos passos do Teste 1, até etapa 5)**
   - Ver timer em 05:00

2. **Em Outra Aba: Abrir PartnerArea**
   - Fazer login como entregador
   - Ir para `components/PartnerArea.tsx`
   - Você deve ver uma entrega disponível

3. **Entregador Aceita a Entrega**
   - Clicar em "Aceitar" na entrega
   - Anotar a hora (Ex: 14:32:30 - logo após solicitar)
   - ✅ Esperado: Entrega muda para "Aceito"

4. **Voltar à Aba da Loja**
   - Voltar para `StoreRequest.tsx`
   - ✅ Timer deve parar ou desaparecer
   - ✅ Notificação de "Entregador Aceito" deve aparecer
   - ✅ Nenhuma notificação de cancelamento deve aparecer

5. **Verificar Status**
   - Ir para Histórico
   - Procurar pelo código de entrega
   - ✅ Status deve ser: **Aceito** (em azul)
   - ✅ NÃO deve ser CANCELLED

### ✅ Sucesso esperado
```
Status: ACCEPTED (azul) - NÃO CANCELLED
Timer: Parou ou desapareceu
Notificações: Apenas de aceite, sem cancelamento
```

---

## 🧪 Teste 3: Cancelamento com Empréstimo Ativo

### Objetivo
Verificar que cancelamento automático funciona também quando há empréstimo.

### Passos

1. **Setup: Cria Empréstimo Ativo**
   - Ir para StoreRequest
   - Ter saldo insuficiente
   - Ativar modal de empréstimo
   - Confirmar empréstimo
   - Solicitar entrega com empréstimo

2. **Aguardar 5 Minutos**
   - Mesmo que Teste 1
   - NÃO aceitar entrega
   - Deixar timer expirar

3. **Verificar Cancelamento**
   - ✅ Notificação: "Entrega cancelada..."
   - ✅ Saldo deve incluir reembolso
   - ✅ Histórico mostra CANCELLED

### ✅ Sucesso esperado
```
Saldo anterior: R$ 20,00
Após empréstimo: -R$ 80,00 (débito do empréstimo)
Após cancelamento: -R$ 80,00 (mantém, mas entrega reembolsada)
```

---

## 🧪 Teste 4: Saída e Retorno à Página Durante Timer

### Objetivo
Verificar que timer continua funcionando mesmo com saída da página.

### Passos

1. **Solicitar Entrega**
   - Ver timer em 05:00

2. **Sair da Página**
   - Clicar em outra seção (ex: "Histórico", "Carteira")
   - Sair completamente de StoreRequest

3. **Aguardar ~3 minutos**
   - Navegar por outras páginas
   - Não interagir com StoreRequest

4. **Voltar para StoreRequest**
   - Clicar novamente em "Solicitar Entrega"
   - ✅ Se 5 minutos já passaram:
     - Timer não aparece
     - Entrega já está em histórico como CANCELLED
   - ✅ Se menos de 5 minutos:
     - Timer continua do ponto onde parou
     - Exemplo: se saiu aos 3:30, volta com 1:50

5. **Verificar Histórico**
   - Ir para OrderHistory
   - ✅ Entrega aparece como CANCELLED (se 5 min passou)

### ✅ Sucesso esperado
```
Entrega cancelada mesmo sem estar na página StoreRequest
Histórico atualizado corretamente
Nenhum erro no console
```

---

## 🧪 Teste 5: Múltiplas Entregas Simultâneas

### Objetivo
Verificar que múltiplas entregas com timeout funcionam independentemente.

### Passos

1. **Solicitar Entrega #1**
   - Anotar código: #1234
   - Ver timer em 05:00

2. **Rapidamente Solicitar Entrega #2**
   - (mesmo formulário - pode haver reset)
   - Anotar código: #5678
   - Ver timer em 05:00

3. **Aceitar Entrega #2 Aos 3 Minutos**
   - Como entregador em outra aba
   - Aceitar #5678
   - ✅ Notificação de aceite para #5678

4. **Deixar #1 Expirar**
   - Não aceitar #1234
   - Aguardar timeout

5. **Verificar Histórico**
   - ✅ #1234: CANCELLED
   - ✅ #5678: ACCEPTED

### ✅ Sucesso esperado
```
#1234: CANCELLED (vermelho)
#5678: ACCEPTED (azul)
Cada uma processada independentemente
```

---

## 🧪 Teste 6: Verificação de Reembolso na Carteira

### Objetivo
Validar que o reembolso realmente aparece na carteira.

### Passos

1. **Anotar Saldo Inicial**
   - Ir para Carteira/Saldo
   - Anotar: **R$ 500,00**

2. **Solicitar Entrega**
   - Custo: R$ 100,00
   - ✅ Saldo após solicitar: **R$ 400,00**

3. **Aguardar Timeout**
   - 5 minutos

4. **Verificar Saldo Após Cancelamento**
   - Ir para Carteira
   - ✅ Saldo deve ser: **R$ 500,00** (restaurado)
   - ✅ Deve haver transação visível:
     ```
     Tipo: Reembolso
     Valor: +R$ 100,00
     Motivo: Cancelado por falta de entregador
     Data: [hoje]
     ```

5. **Verificar Transações**
   - Se houver seção de histórico de transações:
   ```
   ┌─────────────────────────────────────────┐
   │ [13:45] Solicitação entrega   -R$ 100,00│
   │ [13:50] Reembolso por cancelamento +R$ 100,00│
   └─────────────────────────────────────────┘
   ```

### ✅ Sucesso esperado
```
Saldo antes: R$ 500,00
Saldo depois: R$ 500,00 (igual, pois foi reembolsado)
Transações: Debit + Credit visíveis
```

---

## 🧪 Teste 7: Verificação de Logs no Console

### Objetivo
Verificar que erros (se houver) são logados corretamente.

### Passos

1. **Abrir Console (F12)**
   - Pressione F12
   - Vá para aba "Console"

2. **Solicitar Entrega**
   - Completar formulário
   - Solicitar

3. **Aguardar Timeout**

4. **Verificar Logs**
   - Se tudo correr bem: nenhum erro
   - Se houver erro, você verá:
   ```javascript
   Erro ao cancelar solicitação expirada: {error details}
   ```

5. **Se Houver Erro:**
   - Anote a mensagem completa
   - Verifique se Supabase está respondendo
   - Verifique se há permissões corretas

### ✅ Sucesso esperado
```
Console: Sem erros ou com erro informativo
Notificação: "Entrega cancelada..." (info) ou "Erro..." (error)
```

---

## 📊 Matriz de Testes

| Teste | Objetivo | Status Esperado | Resultado |
|-------|----------|-----------------|-----------|
| 1 | Timeout normal | CANCELLED | ✅ |
| 2 | Aceite rápido | ACCEPTED | ✅ |
| 3 | Timeout com empréstimo | CANCELLED | ✅ |
| 4 | Saída/retorno página | CANCELLED (async) | ✅ |
| 5 | Múltiplas entregas | Independentes | ✅ |
| 6 | Reembolso carteira | Saldo restaurado | ✅ |
| 7 | Logs console | Sem erros | ✅ |

---

## 🔍 Checklist de Validação Final

Após concluir todos os testes, validar:

- [ ] Timer de 5 minutos funciona
- [ ] Cancelamento automático ocorre
- [ ] Reembolso é processado
- [ ] Histórico mostra CANCELLED
- [ ] Notificação é exibida
- [ ] Aceite rápido previne cancelamento
- [ ] Saída de página não afeta timer
- [ ] Múltiplas entregas são independentes
- [ ] Saldo da carteira está correto
- [ ] Nenhum erro no console
- [ ] Memory leak não ocorre ao desmontar componente
- [ ] Comportamento retrocompatível (aceites rápidos não quebrados)

---

## 📞 Reportar Problemas

Se algum teste falhar:

1. **Abra o Console (F12)**
2. **Reproduza o teste**
3. **Copie o erro exato**
4. **Verifique:**
   - Supabase está online?
   - Função `auto_cancel_unaccepted_request` existe?
   - Permissões SQL estão corretas?
5. **Reporte com:**
   - Teste específico que falhou
   - Mensagem de erro exata
   - Passo a passo para reproduzir

---

## 🎯 Resultado Esperado Final

Após todos os testes passarem:

✅ **Sistema automático de cancelamento funciona perfeitamente**
✅ **Lojistas não precisam mais cancelar manualmente**
✅ **Reembolsos são processados automaticamente**
✅ **Histórico fica consistente**
✅ **Zero impacto no fluxo de aceite rápido**
