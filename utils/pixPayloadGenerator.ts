
// Função geradora de payload PIX estático
// Baseado no padrão EMV QRCode

interface PixData {
    key: string;
    city: string;
    name: string;
    amount: number;
    description?: string; // TXID
    keyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP'; // Opcional para ajudar na normalização
}

// Funções de normalização exportadas para uso geral e testes

export function normalizarChavePix(chave: string, tipoSugrido?: string): string {
    if (!chave) return "";

    const chaveLimpa = chave.trim();

    // 1. Identificação por tipo sugerido ou detecção automática
    let tipo = tipoSugrido?.toUpperCase() || '';

    // Remove caracteres especiais para anáise de dígitos
    const apenasNumeros = chaveLimpa.replace(/\D/g, "");

    // Detecção Automática se não informado
    if (!tipo) {
        if (chaveLimpa.includes('@')) {
            tipo = 'EMAIL';
        } else if (chaveLimpa.startsWith('+') || (apenasNumeros.length > 11 && apenasNumeros.length < 14)) {
            // Assume telefone se começar com + ou tiver tamanho típico de cel (ex: 5511999999999 = 13 digitos)
            tipo = 'PHONE';
        } else if (apenasNumeros.length === 11) {
            tipo = 'CPF';
        } else if (apenasNumeros.length === 14) {
            tipo = 'CNPJ';
        } else if (chaveLimpa.length >= 32) {
            tipo = 'EVP';
        } else {
            // Fallback: Tenta adivinhar pelo formato
            if (apenasNumeros.length > 0) tipo = 'PHONE'; // Default numeral
            else tipo = 'EMAIL'; // Default texto
        }
    }

    // 2. Normalização por regra
    switch (tipo) {
        case 'CPF':
            // Apenas números, 11 dígitos
            return apenasNumeros.padStart(11, '0');

        case 'CNPJ':
            // Apenas números, 14 dígitos
            return apenasNumeros.padStart(14, '0');

        case 'PHONE':
        case 'TELEFONE':
        case 'CELULAR':
            // Formato +5511999999999
            // Se já tem +, começamos a limpar
            if (chaveLimpa.startsWith('+')) {
                return '+' + chaveLimpa.replace(/\D/g, "");
            }
            // Se não tem +, e parece ser local (11999999999), adiciona +55
            if (apenasNumeros.length >= 10 && apenasNumeros.length <= 11) {
                return '+55' + apenasNumeros;
            }
            // Se já parece ter DDI (5511999999999)
            if (apenasNumeros.length > 11) {
                return '+' + apenasNumeros;
            }
            return '+' + apenasNumeros; // Fallback

        case 'EMAIL':
        case 'E-MAIL':
            // Lowercase, trim
            return chaveLimpa.toLowerCase();

        case 'EVP':
        case 'CHAVE_ALEATORIA':
            // Manter como está (case sensitive?), geralmente lowercase ou hífens são importantes?
            // EVP: geralmente 32 chars hexa com hífens 8-4-4-4-12.
            // O padrão DIZ que deve ser a string original. Não vamos remover hífens do EVP se eles existirem.
            return chaveLimpa;

        default:
            return chaveLimpa;
    }
}

export function normalizarNomePix(nome: string): string {
    if (!nome) return "RECEBEDOR";

    // 1. Remover acentos
    let normalized = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 2. Remover caracteres especiais (manter letras, números e espaços)
    normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, "");

    // 3. Remover espaços extras
    normalized = normalized.trim().replace(/\s+/g, " ");

    // 4. Limitar a 25 caracteres
    if (normalized.length > 25) {
        normalized = normalized.substring(0, 25);
    }

    return normalized || "RECEBEDOR";
}

export function normalizarCidadePix(cidade: string): string {
    if (!cidade) return "BRASILIA";

    // 1. Remover UF no final (ex: "- MG", " - SP", "/RJ", " (PR)")
    let normalized = cidade.replace(/[\s\-\/\(]+[A-Za-z]{2}[\)]?\s*$/, "");

    // 2. Remover acentos
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 3. Remover caracteres especiais
    normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, "");

    // 4. Remover espaços extras
    normalized = normalized.trim().replace(/\s+/g, " ");

    // 5. Se já couber, retorna
    if (normalized.length <= 15) return normalized;

    // 6. Abreviação inteligente (Restaurada)
    const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no'];
    let words = normalized.split(" ");
    words = words.filter(w => !preposicoes.includes(w.toLowerCase()));
    normalized = words.join(" ");

    if (normalized.length <= 15) return normalized;

    const mapAbbr: Record<string, string> = {
        'Santo': 'Sto', 'Santa': 'Sta', 'Sao': 'S', 'Nossa': 'N', 'Nosso': 'N',
        'Doutor': 'Dr', 'Presidente': 'Pres', 'Coronel': 'Cel', 'General': 'Gen',
        'Professor': 'Prof', 'Jardim': 'Jd', 'Vila': 'Vl', 'Parque': 'Pq', 'Ferreira': 'Ferr',
        'Antonio': 'Ant', 'Aparecida': 'Ap', 'Rodrigues': 'Rod'
    };

    words = words.map(w => mapAbbr[w] || w);
    normalized = words.join(" ");

    // 7. Corte final mandatório se ainda exceder
    return normalized.substring(0, 15).trim();
}

export const generatePixPayload = ({ key, name, city, amount, description, keyType }: PixData): string => {
    const ID_PAYLOAD_FORMAT_INDICATOR = "00";
    const ID_POINT_OF_INITIATION_METHOD = "01";
    const ID_MERCHANT_ACCOUNT_INFORMATION = "26";
    const ID_MERCHANT_ACCOUNT_INFORMATION_GUI = "00";
    const ID_MERCHANT_ACCOUNT_INFORMATION_KEY = "01";
    const ID_MERCHANT_CATEGORY_CODE = "52";
    const ID_TRANSACTION_CURRENCY = "53";
    const ID_TRANSACTION_AMOUNT = "54";
    const ID_COUNTRY_CODE = "58";
    const ID_MERCHANT_NAME = "59";
    const ID_MERCHANT_CITY = "60";
    const ID_ADDITIONAL_DATA_FIELD_TEMPLATE = "62";
    const ID_ADDITIONAL_DATA_FIELD_TEMPLATE_TXID = "05";
    const ID_CRC16 = "63";

    function getValue(id: string, value: string) {
        const size = String(value.length).padStart(2, "0");
        return id + size + value;
    }

    function getMerchantAccountInfo() {
        const gui = getValue(ID_MERCHANT_ACCOUNT_INFORMATION_GUI, "br.gov.bcb.pix");

        // Aplica normalização robusta da chave
        const cleanKey = normalizarChavePix(key, keyType);

        const k = getValue(ID_MERCHANT_ACCOUNT_INFORMATION_KEY, cleanKey);
        return getValue(ID_MERCHANT_ACCOUNT_INFORMATION, gui + k);
    }

    function getAdditionalDataFieldTemplate() {
        let txid = description || '';
        // Remove caracteres especiais, permite apenas A-Z a-z 0-9
        txid = txid.replace(/[^a-zA-Z0-9]/g, '');

        if (!txid) {
            // Gera TXID aleatório se vazio
            const now = Date.now().toString(36).toUpperCase();
            const random = Math.floor(Math.random() * 1000).toString(36).toUpperCase();
            txid = (now + random).substring(0, 25);
        } else {
            txid = txid.substring(0, 25);
        }

        if (!txid) txid = "***";

        const val = getValue(ID_ADDITIONAL_DATA_FIELD_TEMPLATE_TXID, txid);
        return getValue(ID_ADDITIONAL_DATA_FIELD_TEMPLATE, val);
    }

    function calculateCRC16(payload: string) {
        let crc = 0xFFFF;
        let poly = 0x1021;
        let str = payload + "6304";
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? ((crc << 1) ^ poly) : (crc << 1);
            }
        }
        return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    }

    const cleanedName = normalizarNomePix(name);
    const cleanedCity = normalizarCidadePix(city);
    const fixedAmount = amount.toFixed(2);

    let payload =
        getValue(ID_PAYLOAD_FORMAT_INDICATOR, "01") +
        getValue(ID_POINT_OF_INITIATION_METHOD, "12") +
        getMerchantAccountInfo() +
        getValue(ID_MERCHANT_CATEGORY_CODE, "0000") +
        getValue(ID_TRANSACTION_CURRENCY, "986") +
        getValue(ID_TRANSACTION_AMOUNT, fixedAmount) +
        getValue(ID_COUNTRY_CODE, "BR") +
        getValue(ID_MERCHANT_NAME, cleanedName) +
        getValue(ID_MERCHANT_CITY, cleanedCity) +
        getAdditionalDataFieldTemplate();

    const crc16 = calculateCRC16(payload);
    return payload + ID_CRC16 + "04" + crc16;
};
