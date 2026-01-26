# Solução: Erro de Porta em Uso (EADDRINUSE)

## O que está acontecendo

Você tem **dois servidores tentando usar a porta 4000 ao mesmo tempo**:

1. ✅ **Servidor ativo** (rodando há mais de 1 hora):
   ```
   $env:PORT=4000; npx tsx watch server/server.ts
   ```

2. ❌ **Tentativa de segundo servidor** (falhou):
   ```
   npm run dev
   ```
   Este comando tentou iniciar outro servidor na mesma porta e falhou.

## Solução Rápida

Você tem duas opções:

### Opção 1: Usar Apenas o Servidor Atual (Recomendado)
O servidor já está rodando corretamente na porta 4000. **Não precisa fazer nada!**

- Acesse: `http://localhost:4000`
- O servidor tem hot-reload (tsx watch), então ele já recarrega automaticamente quando você edita arquivos.

### Opção 2: Trocar para o npm run dev
Se você prefere usar o `npm run dev`:

1. **Pare o servidor antigo** no terminal que mostra:
   ```
   $env:PORT=4000; npx tsx watch server/server.ts
   ```
   Pressione `Ctrl+C` nesse terminal.

2. **Depois** execute:
   ```
   npm run dev
   ```

## Importante

- **Não execute os dois comandos ao mesmo tempo!**
- Use apenas **um servidor** por vez.
- O servidor com `tsx watch` já tem todas as atualizações de código que fizemos (incluindo o logging detalhado).

## Próximo Passo para o Chat

Agora que o servidor está rodando (porta 4000), tente enviar uma mensagem novamente pelo Menu Digital e observe os logs no terminal do servidor. Você deverá ver mensagens como:

```
[sendInternalMessage] Recebido: { storeId: '...', visitorId: '...', ... }
```

**Me envie os logs que aparecerem** para que eu possa identificar o erro exato do chat.
