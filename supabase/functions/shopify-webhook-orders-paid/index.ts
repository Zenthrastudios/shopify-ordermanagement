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
    console.log("Received order paid webhook:", { shopDomain, topic: shopifyTopic });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("shopify_order_id", orderData.id)
      .maybeSingle();

    if (order) {
      await supabase
        .from("orders")
        .update({
          financial_status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      console.log(`Order ${orderData.order_number || orderData.id} marked as paid`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Order marked as paid" }),
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
