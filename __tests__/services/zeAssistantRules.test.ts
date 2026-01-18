
// Mock simples para testar lógica de regras
import { describe, test, expect } from 'vitest';
import { zeAssistantRulesService } from '../../server/services/zeAssistantRulesService';

describe('ZeAssistant Rules Service', () => {
    test('Deve substituir variáveis no template corretamente', async () => {
        const template = 'Olá, somos a {{store_name}}. O produto custa {{price}}.';
        const context = {
            variables: {
                store_name: 'Minha Loja',
                price: 'R$ 10,00'
            }
        };

        // Como o método é privado/protegido ou depende de DB, vamos simular a lógica de substituição isoladamente
        // Mas o serviço expõe applyTemplate. Vamos testar se conseguimos mockar o DB ou testar a lógica pura.

        // Na implementação atual do service, applyTemplate busca dados do DB se as variáveis não estiverem no contexto.
        // Vamos testar se ele usa o contexto fornecido.

        const result = await zeAssistantRulesService.applyTemplate(
            { response_template: template } as any,
            'store-123',
            context
        );

        expect(result).toBe('Olá, somos a Minha Loja. O produto custa R$ 10,00.');
    });
});
