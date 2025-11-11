import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Shopify-Topic, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const shopifyTopic = req.headers.get("X-Shopify-Topic");
    const shopDomain = req.headers.get("X-Shopify-Shop-Domain");

    if (!shopifyTopic || !shopDomain) {
      return new Response(
        JSON.stringify({ error: "Missing required Shopify headers" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orderData = await req.json();
    console.log("Received order update webhook:", { shopDomain, topic: shopifyTopic });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: store } = await supabase
      .from("shopify_stores")
      .select("id")
      .eq("shop_domain", shopDomain)
      .maybeSingle();

    if (!store) {
      return new Response(
        JSON.stringify({ error: "Store not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await processOrder(supabase, orderData, store.id);

    return new Response(
      JSON.stringify({ success: true, message: "Order updated" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processOrder(supabase: any, orderData: any, storeId: string) {
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("shopify_order_id", orderData.id)
    .maybeSingle();

  const orderPayload = {
    store_id: storeId,
    shopify_order_id: orderData.id,
    order_number: orderData.order_number || orderData.name?.replace("#", "") || orderData.id,
    email: orderData.email || orderData.contact_email || "no-email@example.com",
    customer_name: orderData.customer
      ? `${orderData.customer.first_name || ""} ${orderData.customer.last_name || ""}`.trim()
      : orderData.billing_address
      ? `${orderData.billing_address.first_name || ""} ${orderData.billing_address.last_name || ""}`.trim()
      : "Guest",
    financial_status: orderData.financial_status || "pending",
    fulfillment_status: orderData.fulfillment_status || null,
    total_price: parseFloat(orderData.total_price || orderData.current_total_price || "0"),
    subtotal_price: parseFloat(orderData.subtotal_price || orderData.current_subtotal_price || "0"),
    total_tax: parseFloat(orderData.total_tax || orderData.current_total_tax || "0"),
    currency: orderData.currency || orderData.presentment_currency || "USD",
    phone: orderData.phone || orderData.customer?.phone || null,
    billing_name: orderData.billing_address
      ? `${orderData.billing_address.first_name || ""} ${orderData.billing_address.last_name || ""}`.trim()
      : null,
    billing_address: orderData.billing_address || null,
    shipping_name: orderData.shipping_address
      ? `${orderData.shipping_address.first_name || ""} ${orderData.shipping_address.last_name || ""}`.trim()
      : null,
    shipping_address: orderData.shipping_address || null,
    payment_method: orderData.payment_gateway_names?.[0] || orderData.gateway || null,
    payment_reference: orderData.checkout_id || null,
    shipping_method: orderData.shipping_lines?.[0]?.title || null,
    shipping_price: orderData.shipping_lines?.[0]
      ? parseFloat(orderData.shipping_lines[0].price || "0")
      : null,
    order_data: orderData,
    tags: orderData.tags ? orderData.tags.split(",").map((t: string) => t.trim()) : [],
    note: orderData.note || "",
    updated_at: new Date().toISOString(),
    cancelled_at: orderData.cancelled_at || null,
  };

  let orderId: string;

  if (existingOrder) {
    await supabase
      .from("orders")
      .update(orderPayload)
      .eq("id", existingOrder.id);
    orderId = existingOrder.id;
  } else {
    const { data: newOrder } = await supabase
      .from("orders")
      .insert({...orderPayload, created_at: orderData.created_at || new Date().toISOString()})
      .select("id")
      .single();
    orderId = newOrder.id;
  }

  if (orderData.line_items && orderData.line_items.length > 0) {
    await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    const lineItems = orderData.line_items.map((item: any) => ({
      order_id: orderId,
      shopify_line_item_id: item.id,
      product_id: item.product_id || 0,
      variant_id: item.variant_id || 0,
      title: item.title || item.name || "Unknown Product",
      variant_title: item.variant_title || "",
      quantity: item.quantity || 1,
      price: parseFloat(item.price || "0"),
      sku: item.sku || "",
      image_url: item.properties?.find((p: any) => p.name === "image")?.value || "",
      fulfillment_status: item.fulfillment_status || "unfulfilled",
    }));

    await supabase.from("order_items").insert(lineItems);
  }

  console.log(`Order ${orderPayload.order_number} updated successfully`);
}
