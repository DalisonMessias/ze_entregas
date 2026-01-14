
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
        // 1. Auth Check (User who is paying/borrowing)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('Unauthorized');
        }

        // 2. Fetch InfinitePay Configuration (Admin/System Level)
        // We use Service Role Key to bypass RLS and find the system admin's config
        // Note: Using SERVICE_ROLE_KEY env var (set manually) as SUPABASE_ prefix is reserved
        const serviceRoleKey = (Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) ?? '';

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey
        )

        // Find the configuration for InfinitePay (from any admin user)
        // Assuming the first entry found with service_name='infinitepay' is the valid system config
        const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
            .from('api_keys')
            .select('*')
            .eq('service_name', 'infinitepay')
            .limit(1)
            .maybeSingle();

        if (apiKeyError) {
            console.error('Database Error (Admin Config):', apiKeyError);
            throw new Error('Failed to retrieve system configuration');
        }

        // Use handle from database config if available, explicit override from request, or fallback env
        const dbHandle = apiKeyData?.permissions?.handle;
        const configHandle = dbHandle || handle || Deno.env.get('INFINITEPAY_HANDLE');

        if (!configHandle) {
            throw new Error('Configuration Error: InfinitePay Handle (@loja) not found in System Config.');
        }

        // Convert amount to cents (InfinitePay uses cents)
        const amountInCents = Math.round(amount * 100)

        // ... (rest of logic)

        const finalPayload = {
            handle: configHandle, // Use resolved handle
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
                'Content-Type': 'application/json'
                // No Authorization header needed for public checkout links
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
