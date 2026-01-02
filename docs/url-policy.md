# Política de URL Dinâmica

## Objetivo
Garantir 100% de portabilidade entre ambientes (dev, staging, produção) sem modificações manuais em URLs.

## Regras
- Proibição absoluta de URLs locais fixas: `http://localhost:*`, `http://127.0.0.1:*`.
- Proibido hardcode de portas em URLs.
- Toda construção deve usar `baseURL = window.location.origin` (frontend) ou `API_BASE_URL` (backend/tests).

## Implementação
- Utilitário `src/utils/baseURL.ts` expõe `baseURL`, `getBaseURL()` e `buildURL(path)`.
- Guard de runtime `src/policy/urlPolicy.ts` inicializado em `index.tsx` aplica a política e registra eventos.
- Whitelist automática em desenvolvimento para `localhost` nas portas: `3000`, `3001`, `5173` (configurável via `VITE_DEV_PORTS`).
- Proxy de desenvolvimento (`vite.config.ts`) redireciona `/api` para `http://localhost:3001`.
- Backend usa base dinâmica: `API_BASE_URL` ou `HOST:PORT` sem literais a localhost.
- Página `StreetsNeighborhoods.tsx` usa `${baseURL}/api/...`.

## Lint e Testes
- Regra ESLint `eslint/rules/no-localhost-urls.js` ativada por `eslint.config.cjs`.
- Script de verificação `npm run lint:urls` varre o código sem dependências externas.
- Testes (`vitest`):
  - `tests/noLocalURLs.spec.ts` garante ausência de URLs fixas.
  - `tests/urlPolicy.runtime.spec.ts` valida bloqueios em runtime.

## Exceções e Fallbacks
- Em desenvolvimento, URLs explícitas para `localhost` nas portas whitelisted são permitidas e registradas.
- Chamadas relativas (`/api/...`) são sempre permitidas.
- Quando `window.location` não estiver disponível, usar `import.meta.env.VITE_API_URL` (frontend build) ou `process.env.API_BASE_URL` (Node/tests).
- Tentativas bloqueadas disparam eventos `url-policy-blocked` e são registradas.

## Validação de Ambiente
- `validateEnvConfig()` verifica base URL na inicialização e emite aviso se ausente.

## Monitoramento e Logs
- Eventos emitidos:
  - `url-policy-attempt`: toda tentativa de conexão (detalhes: `{ ts, url }`).
  - `url-policy-allowed`: liberação em desenvolvimento (`{ ts, url }`).
  - `url-policy-blocked`: bloqueio por política (`{ ts, url, reason }`).
- `window.__urlPolicyLog` mantém histórico em memória para auditoria.

## Matriz de Portas por Ambiente
- Desenvolvimento: `3000` (frontend), `3001` (API), `5173` (alternativa Vite) — permitidas.
- Produção: sem `localhost`; usar domínio/host oficial — bloqueio aplicado para `localhost`.

## Variáveis de Ambiente
- `VITE_API_URL`: base da API para build.
- `API_BASE_URL`: base da API para backend/tests.
- `VITE_DEV_PORTS`: lista de portas permitidas em dev (ex: `3000,3001,5173`).

## Exemplos
- Correto: ```${baseURL}/api/users```; ```${baseURL}/auth/login```; ```${baseURL}/modules/x```.
- Incorreto: `http://localhost:3001/api/users`.
