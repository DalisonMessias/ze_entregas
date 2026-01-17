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

    // Validar campos obrigatórios EXCLUSIVAMENTE da loja
    if (!profile.store_name || profile.store_name.trim() === '') {
        missingFields.push('Nome da Loja');
    }

    // Usamos phone_number pois geralmente é único para o perfil, mas poderíamos usar um store_phone se existisse
    if (!profile.phone_number || profile.phone_number.trim() === '') {
        missingFields.push('Telefone de Contato');
    }

    // Validar Endereço da LOJA (separado do endereço pessoal)
    if (!profile.store_address_zip || profile.store_address_zip.trim() === '') {
        missingFields.push('CEP da Loja');
    }

    if (!profile.store_address_street || profile.store_address_street.trim() === '') {
        missingFields.push('Rua da Loja');
    }

    if (!profile.store_address_number || profile.store_address_number.trim() === '') {
        missingFields.push('Número da Loja');
    }

    if (!profile.store_address_district || profile.store_address_district.trim() === '') {
        missingFields.push('Bairro da Loja');
    }

    if (!profile.store_address_city || profile.store_address_city.trim() === '') {
        missingFields.push('Cidade da Loja');
    }

    return {
        isValid: missingFields.length === 0,
        missingFields
    };
}
