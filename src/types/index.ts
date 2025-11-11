export interface ShopifyStore {
  id: string;
  store_name: string;
  shop_domain: string;
  access_token?: string;
  api_version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  shopify_order_id?: number;
  csv_order_id?: string;
  order_number: number;
  email: string;
  customer_name: string;
  financial_status: 'pending' | 'paid' | 'refunded' | 'partially_refunded' | 'voided';
  fulfillment_status: 'fulfilled' | 'partial' | 'unfulfilled' | null;
  total_price: number;
  subtotal_price: number;
  total_tax: number;
  currency: string;
  phone?: string;
  billing_name?: string;
  billing_address?: {
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
    province?: string;
    country?: string;
    phone?: string;
  };
  shipping_name?: string;
  shipping_address?: {
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
    province?: string;
    country?: string;
    phone?: string;
  };
  payment_method?: string;
  payment_reference?: string;
  shipping_method?: string;
  shipping_price?: number;
  order_data: any;
  tags: string[];
  note: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  shopify_line_item_id: number;
  product_id: number;
  variant_id: number;
  title: string;
  variant_title: string;
  quantity: number;
  price: number;
  sku: string;
  image_url: string;
  fulfillment_status: string;
  created_at: string;
}

export interface TrackingNumber {
  id: string;
  order_id: string;
  tracking_number: string;
  tracking_company: string;
  tracking_url: string;
  shipment_status: 'pending' | 'in_transit' | 'delivered' | 'exception' | 'returned';
  notified_customer: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkOperation {
  id: string;
  operation_type: 'fulfill' | 'track' | 'export' | 'print' | 'tag' | 'status_update';
  order_ids: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_count: number;
  processed_count: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PrintTemplate {
  id: string;
  template_name: string;
  template_type: 'invoice' | 'shipping_slip' | 'packing_slip';
  template_data: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  id: string;
  setting_key: string;
  setting_value: any;
  created_at: string;
  updated_at: string;
}

export interface ShopifyOrderResponse {
  orders: ShopifyOrder[];
}

export interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  tags: string;
  note: string;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  billing_address: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone: string;
  };
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone: string;
  };
  line_items: ShopifyLineItem[];
  fulfillments: any[];
}

export interface ShopifyLineItem {
  id: number;
  product_id: number;
  variant_id: number;
  title: string;
  variant_title: string;
  quantity: number;
  price: string;
  sku: string;
  fulfillment_status: string | null;
}

export interface OrderFilters {
  search?: string;
  financial_status?: string;
  fulfillment_status?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  tracking: TrackingNumber[];
}
