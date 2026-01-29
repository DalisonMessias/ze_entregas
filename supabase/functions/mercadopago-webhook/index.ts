
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url);
        // Suporte para validação de webhook (alguns gateways mandam GET)
        if (req.method === 'GET') {
            return new Response('OK', { headers: corsHeaders, status: 200 });
        }

        const payload = await req.json();
        console.log('Mercado Pago Webhook Received:', JSON.stringify(payload));

        const { type, data, action } = payload;

        // Mercado Pago can send 'test' notifications
        if (type === 'test') {
            console.log('Test notification received');
            return new Response(JSON.stringify({ receive: true }), { headers: corsHeaders, status: 200 });
        }

        // We only care about payment updates
        // Action can be 'payment.created', 'payment.updated'
        // Type is 'payment'
        if ((type === 'payment' || action === 'payment.updated') && data?.id) {
            const paymentId = data.id;

            // 1. Initialize Supabase Admin Client
            // @ts-ignore
            const supabaseAdmin = createClient(
                // @ts-ignore
                Deno.env.get('SUPABASE_URL') ?? '',
                // @ts-ignore
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );

            // 2. Fetch Mercado Pago Credentials from DB
            // We need to fetch the access token stored in 'payment_gateway_settings'
            const { data: gatewayConfig, error: configError } = await supabaseAdmin
                .from('payment_gateway_settings')
                .select('credentials')
                .eq('gateway_name', 'mercadopago')
                .maybeSingle();

            if (configError || !gatewayConfig || !gatewayConfig.credentials?.accessToken) {
                console.error('Mercado Pago configuration not found or missing access token.');
                return new Response(JSON.stringify({ error: 'Configuration missing' }), { headers: corsHeaders, status: 500 });
            }

            const accessToken = gatewayConfig.credentials.accessToken;

            // 3. Verify Payment Status with Mercado Pago API
            // Never trust the webhook payload blindly for status, always fetch fresh data
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!mpResponse.ok) {
                const errorTxt = await mpResponse.text();
                console.error(`Failed to fetch payment ${paymentId} from Mercado Pago:`, errorTxt);
                return new Response(JSON.stringify({ error: 'Failed to fetch payment data' }), { headers: corsHeaders, status: 502 });
            }

            const paymentData = await mpResponse.json();
            const status = paymentData.status; // approved, pending, rejected, etc.
            const metadata = paymentData.metadata || {};
            const userId = metadata.user_id; // Added in ZePayStoreModule
            const transactionType = metadata.type; // 'zepay_recharge'

            console.log(`Payment ${paymentId} status: ${status}. Type: ${transactionType}. User: ${userId}`);

            // 4. Process Payment if Approved
            if (status === 'approved') {
                if (transactionType === 'zepay_recharge' && userId) {

                    // IDEMPOTENCY CHECK
                    // Check if we already successfully processed this payment ID
                    const { data: existingLog } = await supabaseAdmin
                        .from('payment_gateway_logs')
                        .select('id')
                        .eq('gateway_name', 'mercadopago')
                        .eq('operation_type', 'webhook_processed_success')
                        .textSearch('response_data', `${paymentId}`) // Simple search within JSON, or strict filter if possible
                        // Better: create a dedicated column or reliable JSON path filter. 
                        // Since we can't easily filter JSON path without specific operators depending on PG version/Library
                        // We will rely on searching for the ID in the stored JSON or assuming response_data->id
                        .filter('response_data->>id', 'eq', String(paymentId))
                        .limit(1)
                        .maybeSingle();

                    if (existingLog) {
                        console.log(`Payment ${paymentId} already processed. Skipping.`);
                        return new Response(JSON.stringify({ received: true, status: 'already_processed' }), { headers: corsHeaders, status: 200 });
                    }

                    // EXECUTE CREDIT
                    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('credit_store_wallet', {
                        p_store_id: userId,
                        p_amount: paymentData.transaction_amount,
                        p_description: `Recarga Pix (MP: ${paymentId})`
                    });

                    if (rpcError) {
                        console.error('Error crediting wallet:', rpcError);
                        // Log failure
                        await supabaseAdmin.from('payment_gateway_logs').insert({
                            gateway_name: 'mercadopago',
                            operation_type: 'webhook_processed_error',
                            success: false,
                            request_data: { paymentId, userId },
                            response_data: paymentData,
                            error_message: rpcError.message
                        });
                    } else {
                        console.log('Wallet credited successfully:', rpcData);

                        // LOG SUCCESS (Marker for Idempotency)
                        await supabaseAdmin.from('payment_gateway_logs').insert({
                            gateway_name: 'mercadopago',
                            operation_type: 'webhook_processed_success',
                            success: true,
                            request_data: { payload }, // original payload
                            response_data: paymentData // Contains paymentData.id matching the filter above
                        });
                    }

                } else {
                    console.log('Payment approved but not a zepay_recharge or missing userId');
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), { headers: corsHeaders, status: 200 });

    } catch (error) {
        console.error('Webhook Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 400 });
    }
})
