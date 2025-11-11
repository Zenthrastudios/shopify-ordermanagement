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
        const apiVersion = order.shopify_stores.api_version || "2024-10";

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
          const requestBody = {
            fulfillment: {
              notify_customer: notifyCustomer,
              tracking_info: {
                number: trackingNumber,
                company: trackingCompany,
                url: trackingUrl,
              },
            },
          };

          console.log("Updating fulfillment:", fulfillmentId, "with body:", JSON.stringify(requestBody));

          const updateResponse = await fetch(
            `https://${shopDomain}/admin/api/${apiVersion}/fulfillments/${fulfillmentId}/update_tracking.json`,
            {
              method: "POST",
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify(requestBody),
            }
          );

          console.log("Update response status:", updateResponse.status, updateResponse.statusText);

          if (updateResponse.ok) {
            shopifySuccess = true;
          } else {
            try {
              const errorText = await updateResponse.text();
              console.log("Error response body:", errorText);
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
          // No fulfillment exists yet, we need to create one
          // Get line items for the order
          const { data: lineItems } = await supabase
            .from("order_items")
            .select("shopify_line_item_id, quantity")
            .eq("order_id", orderId);

          if (lineItems && lineItems.length > 0) {
            const createResponse = await fetch(
              `https://${shopDomain}/admin/api/${apiVersion}/orders/${order.shopify_order_id}/fulfillments.json`,
              {
                method: "POST",
                headers: {
                  "X-Shopify-Access-Token": accessToken,
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                },
                body: JSON.stringify({
                  fulfillment: {
                    line_items: lineItems.map(item => ({
                      id: item.shopify_line_item_id,
                      quantity: item.quantity,
                    })),
                    notify_customer: notifyCustomer,
                    tracking_info: {
                      number: trackingNumber,
                      company: trackingCompany,
                      url: trackingUrl,
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