
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        console.log('Webhook received:', JSON.stringify(payload));

        const { order_nsu, transaction_nsu, receipt_url, paid_amount } = payload;

        if (!order_nsu) {
            console.error('Missing order_nsu in payload');
            // Return 200 to avoid retries for bad payload
            return new Response(
                JSON.stringify({ success: true, message: null }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Idempotency Check & Order Lookup
        const { data: existingOrder, error: fetchError } = await supabaseClient
            .from('orders')
            .select('id, infinitepay_status, store_id, total_price')
            .eq('id', order_nsu)
            .single();

        if (fetchError || !existingOrder) {
            console.error('Order not found or error fetching:', fetchError);
            // Return 200 to consume the event
            return new Response(
                JSON.stringify({ success: true, message: null }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // If already completed, ignore (Idempotency)
        if (existingOrder.infinitepay_status === 'COMPLETED' || existingOrder.infinitepay_status === 'PAID') {
            console.log(`Order ${order_nsu} already processed.`);
            return new Response(
                JSON.stringify({ success: true, message: null }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // 2. Update Order Status
        const { error: updateError } = await supabaseClient
            .from('orders')
            .update({
                infinitepay_status: 'COMPLETED',
                status: 'COMPLETED', // Or 'ACCEPTED'
                infinitepay_id: transaction_nsu,
                infinitepay_url: receipt_url,
                infinitepay_metadata: payload,
                amount_paid: paid_amount ? paid_amount / 100 : existingOrder.total_price // InfinitePay sends amount in cents
            })
            .eq('id', order_nsu);

        if (updateError) {
            console.error('Error updating order:', updateError);
            // Even on error, user requested 200 OK. But strictly speaking, if DB fails, we might want retry.
            // User instruction: "Sempre retornar exatamente o JSON... com status 200".
            // I will comply.
            return new Response(
                JSON.stringify({ success: true, message: null }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // 3. Register Wallet Transaction (Credit for Store)
        if (existingOrder.store_id) {
            const { error: walletError } = await supabaseClient.rpc('credit_store_wallet', {
                p_store_id: existingOrder.store_id,
                p_amount: paid_amount ? paid_amount / 100 : existingOrder.total_price,
                p_description: `Venda InfinitePay #${order_nsu.slice(0, 8)}`
            });

            if (walletError) {
                console.error('Error crediting wallet:', walletError);
            }
        }

        // Success Response
        return new Response(
            JSON.stringify({ success: true, message: null }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )

    } catch (error) {
        console.error('Unexpected error:', error)
        // Global catch-all should also return 200 as requested
        return new Response(
            JSON.stringify({ success: true, message: null }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    }
})
