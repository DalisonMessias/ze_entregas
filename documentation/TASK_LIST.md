```
# Lista de Tarefas - Integração Brasil Aberto

## To-Do
- [ ] Verificar a funcionalidade de salvar cidades no painel admin.
- [ ] Finalizar documentação e checklist.

## Concluído
- [x] Verificar tabela `available_cities` e criar tabelas necessárias (`city_districts`, `integration_configs`) no `supabase_global.sql`
- [x] Analisar o esquema da tabela `available_cities` no `supabase_global.sql`.
- [x] Localizar o componente de administração de cidades no front-end.
- [x] Identificar a causa raiz da falha (falta da coluna `updated_at` e trigger inconsistente).
- [x] Corrigir a estrutura da tabela e políticas de RLS no `supabase_global.sql`.
- [x] Criar serviço de integração com API Brasil Aberto (Types, Fetch, Error Handling)
- [x] Criar página Admin "Cidades e Bairros"
- [x] Implementar formulário de API Key
- [x] Implementar seleção de cidade e busca na API externa
- [x] Implementar persistência dos bairros retornados
- [x] Testar e validar
- [x] Atualizar `checklist.txt`
- [x] Adicionar suporte a código IBGE na integração e banco de dados
- [x] Implementar funcionalidade de exclusão de cidades no Admin
```