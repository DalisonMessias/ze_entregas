
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Auth Check
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('Unauthorized')
        }

        const apiKey = Deno.env.get('INFINITEPAY_API_KEY');
        if (!apiKey) {
            console.error('Missing INFINITEPAY_API_KEY');
            throw new Error('Configuration Error: INFINITEPAY_API_KEY is not set on server secrets.');
        }

        const { amount, order_id, handle, items, redirect_url, webhook_url } = await req.json()

        if (!amount || !order_id || !handle) {
            throw new Error('Missing required fields: amount, order_id, handle')
        }

        // Convert amount to cents (InfinitePay uses cents)
        const amountInCents = Math.round(amount * 100)

        // Simplification: use the passed items or create a default one
        const finalItems = items && items.length > 0 ? items.map((i: any) => ({
            quantity: i.quantity,
            price: Math.round(i.price * 100),
            description: i.description
        })) : [
            {
                quantity: 1,
                price: amountInCents,
                description: `Pedido ${order_id}`
            }
        ];

        const finalPayload = {
            handle,
            redirect_url,
            webhook_url,
            order_nsu: order_id,
            items: finalItems,
            metadata: {
                user_id: user.id
            }
        };

        console.log('Sending payload to InfinitePay:', JSON.stringify(finalPayload));

        const response = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('INFINITEPAY_API_KEY')}` // Ensure API Key Use
            },
            body: JSON.stringify(finalPayload),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('InfinitePay Error:', data);
            throw new Error(data.message || 'Failed to create payment link');
        }

        return new Response(
            JSON.stringify(data),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )

    } catch (error) {
        console.error(error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
