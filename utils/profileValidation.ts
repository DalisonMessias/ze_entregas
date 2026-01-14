import { PartnerProfile } from '../types';

/**
 * Valida se o perfil do lojista está completo com todos os campos obrigatórios.
 * Retorna um objeto com isValid (boolean) e missingFields (array de campos faltantes).
 */
export interface ProfileValidationResult {
    isValid: boolean;
    missingFields: string[];
}

export function validateStoreProfile(profile: PartnerProfile | null): ProfileValidationResult {
    if (!profile) {
        return {
            isValid: false,
            missingFields: ['Perfil não encontrado']
        };
    }

    const missingFields: string[] = [];

    // Validar campos obrigatórios
    if (!profile.store_name || profile.store_name.trim() === '') {
        missingFields.push('Nome da Loja');
    }

    if (!profile.phone_number || profile.phone_number.trim() === '') {
        missingFields.push('Telefone');
    }

    if (!profile.city || profile.city.trim() === '') {
        missingFields.push('Cidade');
    }

    if (!profile.address_street || profile.address_street.trim() === '') {
        missingFields.push('Rua');
    }

    if (!profile.address_number || profile.address_number.trim() === '') {
        missingFields.push('Número');
    }

    if (!profile.address_district || profile.address_district.trim() === '') {
        missingFields.push('Bairro');
    }

    return {
        isValid: missingFields.length === 0,
        missingFields
    };
}
