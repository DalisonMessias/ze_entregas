
// Função geradora de payload PIX estático
// Baseado no padrão EMV QRCode

interface PixData {
    key: string;
    name: string;
    city: string;
    amount: number;
    description?: string; // TXID
}

// Funções de normalização exportadas para uso geral e testes

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
    // Regex procura por hífen, barra ou parenteses seguido de 2 letras maiúsculas no final
    let normalized = cidade.replace(/[\s\-\/\(]+[A-Za-z]{2}[\)]?\s*$/, "");

    // 2. Remover acentos
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 3. Remover caracteres especiais
    normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, "");

    // 4. Remover espaços extras
    normalized = normalized.trim().replace(/\s+/g, " ");

    // 5. Se já couber, retorna
    if (normalized.length <= 15) return normalized;

    // 6. Abreviação inteligente

    // A. Remover preposições comuns
    const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no'];
    let words = normalized.split(" ");
    words = words.filter(w => !preposicoes.includes(w.toLowerCase()));
    normalized = words.join(" ");

    if (normalized.length <= 15) return normalized;

    // B. Abreviar títulos e nomes comuns
    const mapAbbr: Record<string, string> = {
        'Santo': 'Sto', 'Santa': 'Sta', 'Sao': 'S', 'Nossa': 'N', 'Nosso': 'N',
        'Doutor': 'Dr', 'Presidente': 'Pres', 'Coronel': 'Cel', 'General': 'Gen',
        'Professor': 'Prof', 'Jardim': 'Jd', 'Vila': 'Vl', 'Parque': 'Pq'
    };

    words = words.map(w => mapAbbr[w] || w);
    normalized = words.join(" ");

    if (normalized.length <= 15) return normalized;

    // C. Corte final se ainda exceder
    return normalized.substring(0, 15).trim();
}

export const generatePixPayload = ({ key, name, city, amount, description }: PixData): string => {
    const ID_PAYLOAD_FORMAT_INDICATOR = "00";
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
        // A chave também não deve ter espaços ou caracteres estranhos, mas geralmente validamos antes
        // Aqui assumimos que a chave vem correta, mas podemos remover espaços por segurança
        const cleanKey = key.trim();
        const k = getValue(ID_MERCHANT_ACCOUNT_INFORMATION_KEY, cleanKey);
        return getValue(ID_MERCHANT_ACCOUNT_INFORMATION, gui + k);
    }

    function getAdditionalDataFieldTemplate() {
        // Se description (TXID) não for passado, gera um aleatório
        let txid = description || '';

        // Remove caracteres especiais do TXID e limita a 25 caracteres (padrão preferencial)
        // O padrão EMV permite caracteres alfanuméricos
        txid = txid.replace(/[^a-zA-Z0-9]/g, '');

        if (!txid) {
            // TXID gerado deve respeitar regex [a-zA-Z0-9]{1,25}
            // Gerar ID único simples
            const now = Date.now().toString(36).toUpperCase();
            const random = Math.floor(Math.random() * 1000).toString(36).toUpperCase();
            txid = (now + random).substring(0, 25);
        } else {
            txid = txid.substring(0, 25);
        }

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
