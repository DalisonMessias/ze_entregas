import { ZeAssistantRule } from '../../types/zeAssistant';

export const DEFAULT_SYSTEM_RULES: Partial<ZeAssistantRule>[] = [
    {
        name: 'Saudação',
        trigger_keywords: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'começar', 'inicio'],
        response_template: '{{greeting_message}} Sou o assistente virtual da {{store_name}}. Como posso ajudar você hoje?',
        priority: 1000,
        match_mode: 'contains',
        is_active: true,
        rule_type: 'SYSTEM'
    },
    {
        name: 'Cardápio/Produtos',
        trigger_keywords: ['cardápio', 'cardapio', 'menu', 'produtos', 'lista', 'o que tem'],
        response_template: 'Aqui estão nossos produtos:\n\n{{products_list}}\n\nPara pedir, basta me dizer o nome do produto e a quantidade.',
        priority: 900,
        match_mode: 'contains',
        is_active: true,
        rule_type: 'SYSTEM'
    },
    {
        name: 'Horário de Funcionamento',
        trigger_keywords: ['horário', 'horario', 'funcionamento', 'aberto', 'fechado', 'horas'],
        response_template: 'Estamos abertos nos seguintes horários:\n{{opening_hours}}',
        priority: 850,
        match_mode: 'contains',
        is_active: true,
        rule_type: 'SYSTEM'
    },
    {
        name: 'Endereço/Localização',
        trigger_keywords: ['endereço', 'endereco', 'onde fica', 'localização', 'localizacao', 'bairro', 'rua'],
        response_template: 'Estamos localizados em:\n{{address}}',
        priority: 850,
        match_mode: 'contains',
        is_active: true,
        rule_type: 'SYSTEM'
    },
    {
        name: 'Formas de Pagamento',
        trigger_keywords: ['pagamento', 'pagar', 'aceita', 'cartão', 'dinheiro', 'pix'],
        response_template: 'Aceitamos: Pix, Cartão de Crédito/Débito e Dinheiro.',
        priority: 800,
        match_mode: 'contains',
        is_active: true,
        rule_type: 'SYSTEM'
    },
    {
        name: 'Falar com Atendente',
        trigger_keywords: ['humano', 'atendente', 'pessoa', 'falar com alguém', 'suporte', 'ajuda'],
        response_template: 'Entendido. Estou transferindo você para um de nossos atendentes. Aguarde um momento.',
        priority: 2000, // Altíssima prioridade para override
        match_mode: 'contains',
        is_active: true,
        rule_type: 'SYSTEM'
    },
    {
        name: 'Status do Pedido',
        trigger_keywords: ['status', 'meu pedido', 'onde ta', 'demora', 'previsão'],
        response_template: 'Vou verificar o status do seu pedido. Por favor, confirme o número do pedido ou o nome de quem fez.',
        priority: 950,
        match_mode: 'contains',
        is_active: true,
        rule_type: 'SYSTEM'
    }
];
