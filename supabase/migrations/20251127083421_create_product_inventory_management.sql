/*
  # Product and Inventory Management Schema

  1. New Tables
    - `products`
      - Core product information
      - Fields: id, shopify_product_id, title, description, vendor, product_type, tags, status
      - Tracks basic product data synced from Shopify
    
    - `product_variants`
      - Product variants (size, color, etc.)
      - Fields: variant_id, product_id, title, sku, price, compare_at_price, barcode, weight
      - Links to products table
    
    - `inventory_items`
      - Inventory tracking for each variant
      - Fields: variant_id, location_id, available, committed, damaged, in_transit, reserved
      - Real-time stock levels
    
    - `inventory_locations`
      - Warehouse/store locations
      - Fields: name, address, is_active, is_default
    
    - `inventory_adjustments`
      - Audit trail for stock changes
      - Fields: variant_id, location_id, adjustment_type, quantity, reason, reference_order_id
      - Tracks every inventory change
    
    - `product_images`
      - Product images
      - Fields: product_id, variant_id, image_url, position, alt_text
    
    - `low_stock_alerts`
      - Automated stock alerts
      - Fields: variant_id, threshold, is_enabled, last_alerted_at
  
  2. Views
    - `product_inventory_summary` - Current stock levels per product
    - `low_stock_items` - Products below threshold
  
  3. Security
    - Enable RLS on all tables
    - Policies for authenticated access
*/

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id bigint UNIQUE,
  title text NOT NULL,
  description text,
  vendor text,
  product_type text,
  tags text[] DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  handle text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);

-- Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_variant_id bigint UNIQUE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  sku text,
  barcode text,
  price numeric(10,2) DEFAULT 0,
  compare_at_price numeric(10,2),
  cost_price numeric(10,2),
  weight numeric(10,2),
  weight_unit text DEFAULT 'kg',
  inventory_policy text DEFAULT 'deny' CHECK (inventory_policy IN ('deny', 'continue')),
  requires_shipping boolean DEFAULT true,
  taxable boolean DEFAULT true,
  position integer DEFAULT 0,
  option1 text,
  option2 text,
  option3 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read variants"
  ON product_variants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert variants"
  ON product_variants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update variants"
  ON product_variants FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_shopify_id ON product_variants(shopify_variant_id);

-- Inventory Locations Table
CREATE TABLE IF NOT EXISTS inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_location_id bigint UNIQUE,
  name text NOT NULL,
  address jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read locations"
  ON inventory_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage locations"
  ON inventory_locations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES inventory_locations(id) ON DELETE CASCADE,
  available integer DEFAULT 0 CHECK (available >= 0),
  committed integer DEFAULT 0 CHECK (committed >= 0),
  damaged integer DEFAULT 0 CHECK (damaged >= 0),
  in_transit integer DEFAULT 0 CHECK (in_transit >= 0),
  reserved integer DEFAULT 0 CHECK (reserved >= 0),
  reorder_point integer DEFAULT 10,
  reorder_quantity integer DEFAULT 50,
  last_counted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(variant_id, location_id)
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inventory"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage inventory"
  ON inventory_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON inventory_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory_items(location_id);

-- Inventory Adjustments Table (Audit Log)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES inventory_locations(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('received', 'sold', 'damaged', 'returned', 'transfer', 'correction', 'adjustment')),
  quantity_change integer NOT NULL,
  quantity_before integer,
  quantity_after integer,
  reason text,
  reference_order_id uuid,
  notes text,
  adjusted_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read adjustments"
  ON inventory_adjustments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert adjustments"
  ON inventory_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_adjustments_variant_id ON inventory_adjustments(variant_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_created_at ON inventory_adjustments(created_at DESC);

-- Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_image_id bigint UNIQUE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  alt_text text,
  position integer DEFAULT 0,
  width integer,
  height integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage images"
  ON product_images FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_images_product_id ON product_images(product_id);

-- Low Stock Alerts Table
CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES inventory_locations(id) ON DELETE CASCADE,
  threshold integer DEFAULT 10,
  is_enabled boolean DEFAULT true,
  last_alerted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(variant_id, location_id)
);

ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage alerts"
  ON low_stock_alerts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Product Inventory Summary View
CREATE OR REPLACE VIEW product_inventory_summary AS
SELECT 
  p.id as product_id,
  p.title as product_title,
  p.status as product_status,
  pv.id as variant_id,
  pv.title as variant_title,
  pv.sku,
  pv.price,
  pv.barcode,
  COALESCE(SUM(ii.available), 0) as total_available,
  COALESCE(SUM(ii.committed), 0) as total_committed,
  COALESCE(SUM(ii.damaged), 0) as total_damaged,
  COALESCE(SUM(ii.in_transit), 0) as total_in_transit,
  COALESCE(SUM(ii.reserved), 0) as total_reserved,
  COALESCE(SUM(ii.available), 0) - COALESCE(SUM(ii.committed), 0) as available_to_sell,
  MIN(ii.reorder_point) as reorder_point,
  COUNT(DISTINCT ii.location_id) as location_count
FROM products p
INNER JOIN product_variants pv ON p.id = pv.product_id
LEFT JOIN inventory_items ii ON pv.id = ii.variant_id
GROUP BY p.id, p.title, p.status, pv.id, pv.title, pv.sku, pv.price, pv.barcode;

-- Low Stock Items View
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
  p.id as product_id,
  p.title as product_title,
  pv.id as variant_id,
  pv.title as variant_title,
  pv.sku,
  ii.available,
  ii.reorder_point,
  ii.reorder_quantity,
  il.name as location_name,
  il.id as location_id
FROM products p
INNER JOIN product_variants pv ON p.id = pv.product_id
INNER JOIN inventory_items ii ON pv.id = ii.variant_id
INNER JOIN inventory_locations il ON ii.location_id = il.id
WHERE ii.available <= ii.reorder_point
  AND p.status = 'active'
  AND il.is_active = true
ORDER BY ii.available ASC;

-- Insert default location if none exists
INSERT INTO inventory_locations (name, is_default, is_active)
SELECT 'Main Warehouse', true, true
WHERE NOT EXISTS (SELECT 1 FROM inventory_locations LIMIT 1);
