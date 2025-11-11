/*
  # Update Orders Schema for CSV Import

  1. Schema Updates
    - Add phone field to orders table
    - Add billing and shipping address fields
    - Make shopify_order_id optional (for non-Shopify sources)
    - Add csv_order_id for tracking CSV order numbers
    - Add payment_method and payment_reference fields

  2. Notes
    - Maintains backward compatibility with existing Shopify integration
    - Supports manual CSV imports from various e-commerce platforms
*/

-- Add new columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'phone'
  ) THEN
    ALTER TABLE orders ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'csv_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN csv_order_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'billing_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN billing_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'billing_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN billing_address jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_address jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_reference'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_reference text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_price'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_price decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Make shopify_order_id nullable for CSV imports
ALTER TABLE orders ALTER COLUMN shopify_order_id DROP NOT NULL;

-- Add index for CSV order lookups
CREATE INDEX IF NOT EXISTS idx_orders_csv_order_id ON orders(csv_order_id);

-- Update unique constraint to allow either shopify_order_id or csv_order_id
DROP INDEX IF EXISTS orders_store_id_shopify_order_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS orders_unique_shopify_order
  ON orders(store_id, shopify_order_id)
  WHERE shopify_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_unique_csv_order
  ON orders(store_id, csv_order_id)
  WHERE csv_order_id IS NOT NULL;
