
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json();
        console.log('MP Checkout Request payload:', JSON.stringify(payload));

        const { orderId, amount, items, payer, back_urls, auto_return } = payload;

        // 1. Initialize Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Server Configuration Error: Missing Supabase Secrets');
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // 2. Fetch MP Credentials
        const { data: gatewayConfig, error: configError } = await supabaseAdmin
            .from('payment_gateway_settings')
            .select('credentials')
            .eq('gateway_name', 'mercadopago')
            .maybeSingle();

        if (configError || !gatewayConfig || !gatewayConfig.credentials?.accessToken) {
            throw new Error('Mercado Pago Access Token not configured.');
        }

        const accessToken = gatewayConfig.credentials.accessToken;

        // 3. Create Preference
        const preferenceData = {
            items: items.map((item: any) => ({
                id: item.id || 'item-id',
                title: item.title || 'Produto',
                description: item.description || '',
                picture_url: item.picture_url || '',
                category_id: 'others',
                quantity: Number(item.quantity),
                currency_id: 'BRL',
                unit_price: Number(item.unit_price)
            })),
            payer: {
                name: payer?.name || 'Cliente',
                email: payer?.email || 'cliente@email.com',
                phone: {
                    area_code: '',
                    number: payer?.phone || ''
                }
            },
            back_urls: back_urls || {
                success: 'https://zeentregas.com/success',
                failure: 'https://zeentregas.com/failure',
                pending: 'https://zeentregas.com/pending'
            },
            auto_return: auto_return || 'approved',
            external_reference: orderId,
            statement_descriptor: "ZE ENTREGAS",
            notification_url: "https://pjnxrqemjozlpnvoxpmn.supabase.co/functions/v1/mercadopago-webhook"
        };

        console.log('MP Preference Data:', JSON.stringify(preferenceData));

        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferenceData)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('MP API Error:', data);
            throw new Error(data.message || 'Failed to create MP preference');
        }

        return new Response(JSON.stringify({
            init_point: data.init_point,
            sandbox_init_point: data.sandbox_init_point,
            preference_id: data.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Edge Function Exception:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
})
