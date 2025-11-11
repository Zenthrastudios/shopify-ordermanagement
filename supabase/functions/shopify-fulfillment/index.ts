import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FulfillmentRequest {
  orderId: string;
  trackingNumber: string;
  trackingCompany: string;
  trackingUrl?: string;
  notifyCustomer?: boolean;
  shopifyOrderId?: number;
  shopifyFulfillmentId?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { orderId, trackingNumber, trackingCompany, trackingUrl, notifyCustomer = true, shopifyOrderId, shopifyFulfillmentId }: FulfillmentRequest = await req.json();

    if (!orderId || !trackingNumber || !trackingCompany) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("npm:@supabase/supabase-js@2.57.4");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, shopify_stores(*)", { count: "exact" })
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If this is a Shopify order and we have fulfillment info, update Shopify
    let shopifySuccess = false;
    let shopifyError = null;

    if (order.shopify_order_id && order.shopify_stores?.access_token && order.shopify_stores?.shop_domain) {
      try {
        const shopDomain = order.shopify_stores.shop_domain;
        const accessToken = order.shopify_stores.access_token;
        const apiVersion = order.shopify_stores.api_version || "2025-10";

        // First, check if order has a fulfillment
        let fulfillmentId = shopifyFulfillmentId;

        if (!fulfillmentId) {
          // Get order details to find fulfillment ID
          const orderResponse = await fetch(
            `https://${shopDomain}/admin/api/${apiVersion}/orders/${order.shopify_order_id}.json`,
            {
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
            }
          );

          if (orderResponse.ok) {
            try {
              const responseText = await orderResponse.text();
              if (responseText && responseText.trim()) {
                const orderData = JSON.parse(responseText);
                if (orderData.order?.fulfillments && orderData.order.fulfillments.length > 0) {
                  fulfillmentId = orderData.order.fulfillments[0].id;
                }
              }
            } catch (parseError) {
              console.error("Error parsing Shopify order response:", parseError);
            }
          }
        }

        // If we have a fulfillment, update it with tracking
        if (fulfillmentId) {
          const updateResponse = await fetch(
            `https://${shopDomain}/admin/api/${apiVersion}/fulfillments/${fulfillmentId}/update_tracking.json`,
            {
              method: "POST",
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify({
                fulfillment: {
                  notify_customer: notifyCustomer,
                  tracking_info: {
                    number: trackingNumber,
                    company: trackingCompany,
                    url: trackingUrl || `https://track.example.com/${trackingNumber}`,
                  },
                },
              }),
            }
          );

          if (updateResponse.ok) {
            shopifySuccess = true;
          } else {
            try {
              const errorText = await updateResponse.text();
              if (errorText && errorText.trim()) {
                try {
                  shopifyError = JSON.parse(errorText);
                } catch {
                  shopifyError = { message: errorText };
                }
              } else {
                shopifyError = { message: `HTTP ${updateResponse.status}: ${updateResponse.statusText}` };
              }
            } catch (readError) {
              shopifyError = { message: `Failed to read error response: ${readError.message}` };
            }
            console.error("Shopify update error:", shopifyError);
          }
        } else {
          // No fulfillment exists yet, create via fulfillmentCreateV2 style
          // 1) Get fulfillment orders for the order
          const foResp = await fetch(
            `https://${shopDomain}/admin/api/${apiVersion}/orders/${order.shopify_order_id}/fulfillment_orders.json`,
            {
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
            }
          );

          let fulfillmentOrders: Array<{ id: number }>|null = null;
          if (foResp.ok) {
            try {
              const foText = await foResp.text();
              if (foText && foText.trim()) {
                const foData = JSON.parse(foText);
                fulfillmentOrders = foData.fulfillment_orders || [];
              }
            } catch (parseError) {
              console.error("Error parsing fulfillment orders:", parseError);
            }
          }

          if (fulfillmentOrders && fulfillmentOrders.length > 0) {
            const line_items_by_fulfillment_order = fulfillmentOrders.map((fo: { id: number }) => ({
              fulfillment_order_id: fo.id,
            }));

            const createResponse = await fetch(
              `https://${shopDomain}/admin/api/${apiVersion}/fulfillments.json`,
              {
                method: "POST",
                headers: {
                  "X-Shopify-Access-Token": accessToken,
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                },
                body: JSON.stringify({
                  fulfillment: {
                    line_items_by_fulfillment_order,
                    notify_customer: notifyCustomer,
                    tracking_info: {
                      number: trackingNumber,
                      url: trackingUrl || `https://track.example.com/${trackingNumber}`,
                    },
                  },
                }),
              }
            );

            if (createResponse.ok) {
              shopifySuccess = true;
            } else {
              try {
                const errorText = await createResponse.text();
                if (errorText && errorText.trim()) {
                  try {
                    shopifyError = JSON.parse(errorText);
                  } catch {
                    shopifyError = { message: errorText };
                  }
                } else {
                  shopifyError = { message: `HTTP ${createResponse.status}: ${createResponse.statusText}` };
                }
              } catch (readError) {
                shopifyError = { message: `Failed to read error response: ${readError.message}` };
              }
              console.error("Shopify create fulfillment error:", shopifyError);
            }
          }
        }
      } catch (error) {
        console.error("Error updating Shopify:", error);
        shopifyError = error.message;
      }
    }

    // Save tracking info to our database regardless of Shopify sync status
    const { error: trackingError } = await supabase
      .from("tracking_numbers")
      .insert({
        order_id: orderId,
        tracking_number: trackingNumber,
        tracking_company: trackingCompany,
        tracking_url: trackingUrl || `https://track.example.com/${trackingNumber}`,
        shipment_status: "in_transit",
        notified_customer: notifyCustomer && shopifySuccess,
      });

    if (trackingError) {
      return new Response(
        JSON.stringify({ error: "Failed to save tracking info", details: trackingError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update order fulfillment status
    await supabase
      .from("orders")
      .update({ fulfillment_status: "fulfilled" })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        shopifyUpdated: shopifySuccess,
        shopifyError: shopifyError,
        message: shopifySuccess
          ? "Tracking added and Shopify updated successfully"
          : "Tracking added to database (Shopify sync failed or not applicable)",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in fulfillment function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});