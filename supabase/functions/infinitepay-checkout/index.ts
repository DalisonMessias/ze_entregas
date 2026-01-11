
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { amount, order_id, handle, items, redirect_url, webhook_url } = await req.json()

        if (!amount || !order_id || !handle) {
            throw new Error('Missing required fields: amount, order_id, handle')
        }

        // Convert amount to cents (InfinitePay uses cents)
        // Assuming amount comes as float (e.g. 10.50), multiply by 100 and round
        const amountInCents = Math.round(amount * 100)

        const payload = {
            handle: handle,
            redirect_url: redirect_url,
            webhook_url: webhook_url,
            order_nsu: order_id,
            items: items.map((item: any) => ({
                ...item,
                price: Math.round(item.price * 100) // Ensure items are also in cents if passed as float, or assume passed as float
            })),
            metadata: {
                order_id: order_id
            }
        }

        // Adjust payload items price if they are already in cents or not. 
        // The implementation plan says "items": [{ "quantity": 1, "price": 1000, "description": "Pedido #123" }]
        // Usually frontend sends float. Let's make sure we handle it.
        // If we just construct a single item "Pedido" with total amount, it's safer.

        // Simplification: use the passed items or create a default one if items structure is complex
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
            items: finalItems
        };

        console.log('Sending payload to InfinitePay:', JSON.stringify(finalPayload));

        const response = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
