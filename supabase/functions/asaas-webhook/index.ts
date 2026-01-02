// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
// Opcional: Validar token do webhook se configurado no Asaas
const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Validação de segurança básica
        const requestToken = req.headers.get('asaas-access-token');
        if (ASAAS_WEBHOOK_TOKEN && requestToken !== ASAAS_WEBHOOK_TOKEN) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }

        const body = await req.json()
        const { event, payment } = body;

        // Logar webhook recebido
        await supabase.from('asaas_webhook_logs').insert({
            event: event,
            payment_id: payment?.id,
            payload: body,
            status: 'RECEIVED'
        });

        if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
            // Encontrar pedido pelo payment_id ou referência externa
            // Assumindo que o ID do pedido foi salvo no campo externalReference do Asaas,
            // ou que temos o payment_id salvo no pedido. Vamos tentar achar pelo externalReference primeiro.

            let orderId = payment.externalReference;

            if (!orderId) {
                // Tentar achar pedido que tenha esse asaas_payment_id salvo (se salvamos antes)
                // Como a criação de pagamento é stateless na edge function, talvez não tenhamos salvado.
                // O ideal é passar o order_id user_profiles como externalReference na criação da cobrança.
                // Vou assumir que o payment.externalReference é o order_id.

                console.log('No externalReference found in webhook payload');
            } else {
                // Atualizar status do pedido
                const { error } = await supabase
                    .from('orders')
                    .update({
                        status: 'ACCEPTED', // ou PAID, dependendo do fluxo
                        payment_status: 'COMPLETED',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', orderId);

                if (error) {
                    console.error('Error updating order:', error);
                    await supabase.from('asaas_webhook_logs').insert({
                        event: 'ERROR_UPDATING_ORDER',
                        payment_id: payment.id,
                        payload: { error },
                        status: 'ERROR'
                    });
                } else {
                    await supabase.from('asaas_webhook_logs').insert({
                        event: 'ORDER_UPDATED',
                        payment_id: payment.id,
                        payload: { orderId, status: 'ACCEPTED' },
                        status: 'PROCESSED'
                    });
                }
            }
        }

        return new Response(
            JSON.stringify({ received: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        )
    }
})
