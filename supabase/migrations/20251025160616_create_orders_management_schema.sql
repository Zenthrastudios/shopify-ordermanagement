-- # Shopify Orders Management System Schema
--
-- ## Overview
-- This migration creates the complete database schema for a Shopify orders management system
-- with support for order caching, tracking management, bulk operations, and print settings.
--
-- ## New Tables
--
-- 1. shopify_stores - Stores Shopify store connection information
-- 2. orders - Cached Shopify orders data for fast querying
-- 3. order_items - Individual line items from orders
-- 4. tracking_numbers - Tracking information for order fulfillments
-- 5. bulk_operations - Log of bulk operations performed
-- 6. print_templates - Custom templates for invoices and shipping slips
-- 7. system_settings - Application-wide settings and preferences
--
-- ## Security
-- Enable RLS on all tables with appropriate access policies

-- Create shopify_stores table
CREATE TABLE IF NOT EXISTS shopify_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL,
  shop_domain text NOT NULL,
  access_token text,
  api_version text DEFAULT '2024-01',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES shopify_stores(id) ON DELETE CASCADE,
  shopify_order_id bigint NOT NULL,
  order_number integer NOT NULL,
  email text,
  customer_name text,
  financial_status text DEFAULT 'pending',
  fulfillment_status text,
  total_price decimal(10,2) DEFAULT 0,
  subtotal_price decimal(10,2) DEFAULT 0,
  total_tax decimal(10,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  order_data jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  UNIQUE(store_id, shopify_order_id)
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  shopify_line_item_id bigint,
  product_id bigint,
  variant_id bigint,
  title text NOT NULL,
  variant_title text,
  quantity integer DEFAULT 1,
  price decimal(10,2) DEFAULT 0,
  sku text,
  image_url text,
  fulfillment_status text DEFAULT 'unfulfilled',
  created_at timestamptz DEFAULT now()
);

-- Create tracking_numbers table
CREATE TABLE IF NOT EXISTS tracking_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  tracking_number text NOT NULL,
  tracking_company text NOT NULL,
  tracking_url text,
  shipment_status text DEFAULT 'pending',
  notified_customer boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bulk_operations table
CREATE TABLE IF NOT EXISTS bulk_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  order_ids uuid[] DEFAULT '{}',
  status text DEFAULT 'pending',
  total_count integer DEFAULT 0,
  processed_count integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create print_templates table
CREATE TABLE IF NOT EXISTS print_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_type text NOT NULL,
  template_data jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_financial_status ON orders(financial_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_order_id ON tracking_numbers(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_tracking_number ON tracking_numbers(tracking_number);

-- Enable Row Level Security
ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for public access (adjust based on your auth requirements)
-- For now, allowing all operations for development

CREATE POLICY "Allow all operations on shopify_stores"
  ON shopify_stores FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on orders"
  ON orders FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on order_items"
  ON order_items FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on tracking_numbers"
  ON tracking_numbers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on bulk_operations"
  ON bulk_operations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on print_templates"
  ON print_templates FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on system_settings"
  ON system_settings FOR ALL
  USING (true)
  WITH CHECK (true);