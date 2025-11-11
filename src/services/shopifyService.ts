import { supabase } from '../lib/supabase';
import type { ShopifyOrder, Order, OrderItem } from '../types';

export class ShopifyService {
  private shopDomain: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(shopDomain: string, accessToken: string, apiVersion = '2024-01') {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
  }

  private getApiUrl(endpoint: string): string {
    return `https://${this.shopDomain}/admin/api/${this.apiVersion}/${endpoint}`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/shopify-proxy`;

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop_domain: this.shopDomain,
          access_token: this.accessToken,
          endpoint,
          method: options.method || 'GET',
          body: options.body ? JSON.parse(options.body as string) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Shopify API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Shopify API request failed:', error);
      throw error;
    }
  }

  async fetchOrders(params: {
    limit?: number;
    status?: string;
    financial_status?: string;
    fulfillment_status?: string;
    created_at_min?: string;
    created_at_max?: string;
  } = {}): Promise<ShopifyOrder[]> {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.financial_status) queryParams.append('financial_status', params.financial_status);
    if (params.fulfillment_status) queryParams.append('fulfillment_status', params.fulfillment_status);
    if (params.created_at_min) queryParams.append('created_at_min', params.created_at_min);
    if (params.created_at_max) queryParams.append('created_at_max', params.created_at_max);

    const data = await this.makeRequest(`orders.json?${queryParams.toString()}`);
    return data.orders || [];
  }

  async fetchOrder(orderId: number): Promise<ShopifyOrder> {
    const data = await this.makeRequest(`orders/${orderId}.json`);
    return data.order;
  }

  async fetchCustomer(customerId: number): Promise<any> {
    try {
      const data = await this.makeRequest(`customers/${customerId}.json`);
      return data.customer;
    } catch (error) {
      console.error(`Error fetching customer ${customerId}:`, error);
      return null;
    }
  }

  async updateOrderFulfillment(orderId: number, trackingNumber: string, trackingCompany: string): Promise<any> {
    const fulfillment = {
      fulfillment: {
        tracking_number: trackingNumber,
        tracking_company: trackingCompany,
        notify_customer: true,
      },
    };

    return await this.makeRequest(`orders/${orderId}/fulfillments.json`, {
      method: 'POST',
      body: JSON.stringify(fulfillment),
    });
  }

  async syncOrdersToDatabase(storeId: string): Promise<void> {
    try {
      // Step 1: Fetch order list (summary data)
      console.log('Fetching order list...');
      const ordersList = await this.fetchOrders({ limit: 250 });
      console.log(`Found ${ordersList.length} orders to sync`);

      // Step 2: Fetch complete details for each order
      for (let i = 0; i < ordersList.length; i++) {
        const orderSummary = ordersList[i];
        console.log(`Processing order ${i + 1}/${ordersList.length}: #${orderSummary.order_number}`);

        // Fetch full order details
        const shopifyOrder = await this.fetchOrder(orderSummary.id);

        // Fetch full customer data if customer ID exists
        let fullCustomerData = null;
        if (shopifyOrder.customer?.id) {
          console.log(`Fetching customer data for order #${shopifyOrder.order_number}`);
          fullCustomerData = await this.fetchCustomer(shopifyOrder.customer.id);
        }

        // Merge customer data into order data
        const enrichedOrderData = {
          ...shopifyOrder,
          customer: fullCustomerData || shopifyOrder.customer,
        };

        // Extract customer name from various possible locations
        let customerName = '';
        if (fullCustomerData) {
          const firstName = fullCustomerData.first_name || '';
          const lastName = fullCustomerData.last_name || '';
          customerName = `${firstName} ${lastName}`.trim();
        } else if (shopifyOrder.customer) {
          const firstName = shopifyOrder.customer.first_name || '';
          const lastName = shopifyOrder.customer.last_name || '';
          customerName = `${firstName} ${lastName}`.trim();
        }

        // Fallback to shipping address name if customer name is empty
        if (!customerName && shopifyOrder.shipping_address) {
          const firstName = shopifyOrder.shipping_address.first_name || '';
          const lastName = shopifyOrder.shipping_address.last_name || '';
          customerName = `${firstName} ${lastName}`.trim();
        }

        // Fallback to billing address name if still empty
        if (!customerName && shopifyOrder.billing_address) {
          const firstName = shopifyOrder.billing_address.first_name || '';
          const lastName = shopifyOrder.billing_address.last_name || '';
          customerName = `${firstName} ${lastName}`.trim();
        }

        const orderData: Partial<Order> = {
          store_id: storeId,
          shopify_order_id: shopifyOrder.id,
          order_number: shopifyOrder.order_number,
          email: shopifyOrder.email || fullCustomerData?.email,
          customer_name: customerName || 'Guest',
          financial_status: shopifyOrder.financial_status as any,
          fulfillment_status: shopifyOrder.fulfillment_status as any,
          total_price: parseFloat(shopifyOrder.total_price),
          subtotal_price: parseFloat(shopifyOrder.subtotal_price),
          total_tax: parseFloat(shopifyOrder.total_tax),
          currency: shopifyOrder.currency,
          order_data: enrichedOrderData,
          tags: shopifyOrder.tags ? shopifyOrder.tags.split(',').map(t => t.trim()) : [],
          note: shopifyOrder.note || '',
          created_at: shopifyOrder.created_at,
          updated_at: shopifyOrder.updated_at,
          cancelled_at: shopifyOrder.cancelled_at,
        };

        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('store_id', storeId)
          .eq('shopify_order_id', shopifyOrder.id)
          .maybeSingle();

        let orderId: string;

        if (existingOrder) {
          const { data } = await supabase
            .from('orders')
            .update(orderData)
            .eq('id', existingOrder.id)
            .select()
            .single();
          orderId = data!.id;
        } else {
          const { data } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();
          orderId = data!.id;
        }

        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', orderId);

        if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
          const items: Partial<OrderItem>[] = shopifyOrder.line_items.map(item => ({
            order_id: orderId,
            shopify_line_item_id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            title: item.title,
            variant_title: item.variant_title || '',
            quantity: item.quantity,
            price: parseFloat(item.price),
            sku: item.sku || '',
            fulfillment_status: item.fulfillment_status || 'unfulfilled',
          }));

          await supabase.from('order_items').insert(items);
        }

        console.log(`✓ Order #${shopifyOrder.order_number} synced successfully`);
      }

      console.log('Order sync completed successfully!');
    } catch (error) {
      console.error('Error syncing orders to database:', error);
      throw error;
    }
  }
}

export async function getActiveStore() {
  const { data } = await supabase
    .from('shopify_stores')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  return data;
}

export async function createShopifyService() {
  const store = await getActiveStore();

  if (!store || !store.access_token) {
    throw new Error('No active Shopify store configured');
  }

  return new ShopifyService(store.shop_domain, store.access_token, store.api_version);
}
