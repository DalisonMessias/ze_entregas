// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_API_URL = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const {
            amount,
            method,
            customer_id,
            due_date,
            credit_card_info,
            credit_card_holder_info
        } = await req.json()

        if (!ASAAS_API_KEY) {
            throw new Error('ASAAS_API_KEY not configured')
        }

        let payload: any = {
            customer: customer_id,
            billingType: method, // 'PIX', 'BOLETO', 'CREDIT_CARD'
            value: amount,
            dueDate: due_date || new Date().toISOString().split('T')[0],
            description: 'Pedido Zé Entregas',
        };

        if (method === 'CREDIT_CARD') {
            if (!credit_card_info) {
                throw new Error('Credit Card Info is required for CREDIT_CARD method');
            }

            // Tokenização acontece automaticamente ao enviar dados do cartão no payload de criação
            // O Asaas não armazena os dados sensíveis se usarmos o endpoint de payments diretos com os dados
            // Mas o ideal para segurança total seria tokenizar ANTES, mas vamos seguir o fluxo padrão seguro do Asaas
            // Se tivermos os dados do cartão, enviamos junto.
            payload.creditCard = credit_card_info;
            payload.creditCardHolderInfo = credit_card_holder_info;
        }

        const response = await fetch(`${ASAAS_API_URL}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': ASAAS_API_KEY
            },
            body: JSON.stringify(payload)
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Asaas Error:', data);
            return new Response(JSON.stringify({ error: data.errors?.[0]?.description || 'Failed to create payment' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // Para Pix, precisamos pegar o QRCode
        let pixData = null;
        if (method === 'PIX') {
            const pixResponse = await fetch(`${ASAAS_API_URL}/payments/${data.id}/pixQrCode`, {
                headers: { 'access_token': ASAAS_API_KEY }
            });
            if (pixResponse.ok) {
                pixData = await pixResponse.json();
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                payment_id: data.id,
                invoice_ur: data.invoiceUrl,
                bank_slip_url: data.bankSlipUrl,
                pix_copy_paste: pixData?.payload,
                pix_encoded_image: pixData?.encodedImage
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        )
    }
})
