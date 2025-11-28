import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: store } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!store) {
      return new Response(
        JSON.stringify({ error: 'No active Shopify store found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopifyHeaders = {
      'X-Shopify-Access-Token': store.access_token,
      'Content-Type': 'application/json',
    };

    const baseUrl = `https://${store.shop_domain}/admin/api/${store.api_version}/orders.json`;

    let allOrders: any[] = [];
    let url = `${baseUrl}?status=any&limit=250`;
    let pageCount = 0;

    while (url && pageCount < 5) {
      const response = await fetch(url, { headers: shopifyHeaders });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shopify API error:', response.status, errorText);
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const orders = data.orders || [];
      allOrders = allOrders.concat(orders);

      const linkHeader = response.headers.get('Link');
      url = '';

      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch) {
          url = nextMatch[1];
        }
      }

      pageCount++;
    }

    console.log(`Fetched ${allOrders.length} orders from Shopify`);

    let updated = 0;
    let errors = 0;

    for (const order of allOrders) {
      try {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, fulfillment_status')
          .eq('shopify_order_id', order.id.toString())
          .maybeSingle();

        if (existingOrder) {
          const shopifyFulfillmentStatus = order.fulfillment_status || 'unfulfilled';

          if (existingOrder.fulfillment_status !== shopifyFulfillmentStatus) {
            const { error: updateError } = await supabase
              .from('orders')
              .update({
                fulfillment_status: shopifyFulfillmentStatus,
                financial_status: order.financial_status,
                cancelled_at: order.cancelled_at,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingOrder.id);

            if (updateError) {
              console.error(`Error updating order ${order.id}:`, updateError);
              errors++;
            } else {
              updated++;
            }
          }
        }
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: allOrders.length,
        updated,
        errors,
        message: `Synced ${allOrders.length} orders. Updated ${updated} orders.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
