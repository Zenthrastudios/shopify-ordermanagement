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

    const shopifyUrl = `https://${store.shop_domain}/admin/api/${store.api_version}/orders.json`;
    
    let allOrders: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      const response = await fetch(
        `${shopifyUrl}?status=any&limit=250&page=${page}`,
        { headers: shopifyHeaders }
      );

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.statusText}`);
      }

      const { orders } = await response.json();
      allOrders = allOrders.concat(orders);
      
      if (orders.length < 250) {
        hasMore = false;
      } else {
        page++;
      }
    }

    let synced = 0;
    let updated = 0;
    let errors = 0;

    for (const order of allOrders) {
      try {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, fulfillment_status')
          .eq('shopify_order_id', order.id)
          .maybeSingle();

        if (existingOrder) {
          const shopifyFulfillmentStatus = order.fulfillment_status || 'unfulfilled';
          
          if (existingOrder.fulfillment_status !== shopifyFulfillmentStatus) {
            await supabase
              .from('orders')
              .update({
                fulfillment_status: shopifyFulfillmentStatus,
                financial_status: order.financial_status,
                cancelled_at: order.cancelled_at,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingOrder.id);
            
            updated++;
          }
        } else {
          synced++;
        }
      } catch (error) {
        console.error(`Error syncing order ${order.id}:`, error);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: allOrders.length,
        updated,
        synced,
        errors,
        message: `Updated ${updated} orders, ${synced} new orders found`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
