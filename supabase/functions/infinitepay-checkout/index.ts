
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
        const payload = await req.json();
        console.log('Request payload:', JSON.stringify(payload));

        // Support both styles (camelCase and snake_case)
        const amount = payload.amount;
        const orderId = payload.orderId || payload.order_id;
        const handle = payload.handle;
        const items = payload.items;
        const redirectUrl = payload.redirectUrl || payload.redirect_url;
        const webhookUrl = payload.webhookUrl || payload.webhook_url;

        const authHeader = req.headers.get('Authorization');
        const tokenToken = authHeader?.replace('Bearer ', '');
        console.log('Auth Header presence:', !!authHeader);

        if (!tokenToken || tokenToken === 'undefined') {
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                details: 'Auth token missing or malformed',
                header: authHeader ? 'Malformed' : 'Missing'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
        }

        // 1. Initialize Admin Client (to bypass RLS and session issues)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Server Configuration Error: Missing Supabase Secrets');
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // 2. Decode User ID from JWT manually (resilient to session missing)
        let userId = '';
        try {
            const parts = tokenToken.split('.');
            const payload = JSON.parse(atob(parts[1]));
            userId = payload.sub;
            console.log('Decoded User ID:', userId);
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Unauthorized', details: 'Invalid JWT Format' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401
            });
        }

        // 3. Verify User exists in database
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (profileError || !userProfile) {
            console.error('User not found in DB:', profileError);
            return new Response(JSON.stringify({ error: 'Unauthorized', details: 'User not found in database' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401
            });
        }

        // 4. Fetch InfinitePay Configuration
        const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
            .from('api_keys')
            .select('*')
            .eq('service_name', 'infinitepay')
            .limit(1)
            .maybeSingle();

        if (apiKeyError) {
            console.error('Database Error (Admin Config):', apiKeyError);
        }

        console.log('Admin Config found:', !!apiKeyData);

        // PRIORIDADE: Banco > Request > Env
        const dbHandle = apiKeyData?.permissions?.handle;
        const configHandle = dbHandle || handle || Deno.env.get('INFINITEPAY_HANDLE');

        if (!configHandle) {
            throw new Error('Configuration Error: InfinitePay Handle (@loja) not found.');
        }

        console.log('Using Handle:', configHandle);

        // Convert amount to cents (InfinitePay uses cents)
        const amountInCents = Math.round(amount * 100)

        // ... (rest of logic)

        const finalPayload = {
            handle: configHandle,
            redirect_url: redirectUrl,
            webhook_url: webhookUrl,
            order_nsu: orderId,
            items: items || [],
            metadata: {
                user_id: userId
            }
        };

        console.log('Final InfinitePay Payload:', JSON.stringify(finalPayload));

        const response = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(finalPayload),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('InfinitePay API Error:', data);
            throw new Error(data.message || 'Failed to create payment link');
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Edge Function Exception:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
