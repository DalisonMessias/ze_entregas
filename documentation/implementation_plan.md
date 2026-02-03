# Plano de Implementação - Correção do Modelo Gemini

## Goal Description
O usuário relatou que o modelo `gemini-1.5-flash` não gera imagens. O objetivo é alterar para um modelo que suporte geração de imagens, como `gemini-2.0-flash-exp` (ou similar), corrigindo também a sintaxe da chamada para usar uma string única.

## Proposed Changes
### Backend/Service Layer
#### [MODIFY] [geminiImageService.ts](file:///c:/Users/Dalison%20Messias/Documents/GitHub/ze_entregas/services/geminiImageService.ts)
- Alterar a constante `modelOne` para `gemini-2.0-flash-exp`.
- Manter a lógica de tratamento de erro e fallback.

## Verification Plan
### Manual Verification
- Solicitar ao usuário que tente gerar uma imagem novamente na interface do sistema.
- Verificar logs do terminal se houver erro (mas eu não tenho acesso direto aos logs em tempo real, dependo do usuário).
