# Lista de Tarefas — Correção de Versões do package.json

**Data:** 11/06/2026  
**Solicitação:** Corrigir avisos de segurança do IDE sobre dependências com versões variantes (`^`, `~`, `latest`) no `package.json`.

---

## Tarefas

- [x] Analisar o `package.json` e identificar todas as dependências com versões variantes
- [x] Fixar todas as versões de `dependencies` para valores exatos (remoção de `^` e `~`)
- [x] Substituir `"latest"` por versão exata (`0.3.2`) em `@list-labs/react-joyride`
- [x] Fixar todas as versões de `devDependencies` para valores exatos
- [x] Atualizar `checklist.txt` com o registro da correção
- [x] Atualizar `documentation/TASK_LIST.md`

---

## Resumo

Todas as 9 ocorrências de avisos de segurança do IDE foram corrigidas. O `package.json` agora usa versões exatas em todas as 54 dependências (38 em `dependencies` + 16 em `devDependencies`), eliminando riscos de **dependency hijack** e **confusion attacks**.
