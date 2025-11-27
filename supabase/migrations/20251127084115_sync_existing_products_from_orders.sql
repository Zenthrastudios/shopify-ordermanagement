/*
  # Sync Existing Products from Orders
  
  1. Purpose
    - Import existing products from order_items into products table
    - Create variants for each unique product
    - Initialize inventory based on sales data
    
  2. Process
    - Extract unique products from order_items
    - Create product and variant records
    - Set up initial inventory at default location
*/

-- Insert products from order_items
INSERT INTO products (shopify_product_id, title, status, product_type, created_at, updated_at)
SELECT DISTINCT 
  oi.product_id,
  oi.title,
  'active',
  'Physical Products',
  MIN(oi.created_at),
  now()
FROM order_items oi
WHERE oi.product_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM products p WHERE p.shopify_product_id = oi.product_id
  )
GROUP BY oi.product_id, oi.title
ON CONFLICT (shopify_product_id) DO NOTHING;

-- Insert variants from order_items
INSERT INTO product_variants (
  shopify_variant_id,
  product_id,
  title,
  sku,
  price,
  position,
  created_at,
  updated_at
)
SELECT DISTINCT
  oi.variant_id,
  p.id,
  COALESCE(oi.variant_title, 'Default'),
  COALESCE(NULLIF(oi.sku, ''), 'SKU-' || oi.variant_id),
  oi.price,
  0,
  MIN(oi.created_at),
  now()
FROM order_items oi
INNER JOIN products p ON p.shopify_product_id = oi.product_id
WHERE oi.variant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_variants pv WHERE pv.shopify_variant_id = oi.variant_id
  )
GROUP BY oi.variant_id, p.id, oi.variant_title, oi.sku, oi.price
ON CONFLICT (shopify_variant_id) DO NOTHING;

-- Initialize inventory for synced products at default location
DO $$
DECLARE
  default_loc_id uuid;
BEGIN
  SELECT id INTO default_loc_id FROM inventory_locations WHERE is_default = true LIMIT 1;
  
  IF default_loc_id IS NOT NULL THEN
    INSERT INTO inventory_items (
      variant_id,
      location_id,
      available,
      committed,
      reorder_point,
      reorder_quantity,
      created_at,
      updated_at
    )
    SELECT 
      pv.id,
      default_loc_id,
      0,
      0,
      10,
      50,
      now(),
      now()
    FROM product_variants pv
    WHERE NOT EXISTS (
      SELECT 1 FROM inventory_items ii 
      WHERE ii.variant_id = pv.id AND ii.location_id = default_loc_id
    )
    ON CONFLICT (variant_id, location_id) DO NOTHING;
  END IF;
END $$;
