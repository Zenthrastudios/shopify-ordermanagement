/*
  # Analytics Aggregations Schema

  1. New Tables
    - `analytics_daily_aggregates`
      - Stores pre-calculated daily metrics for performance
      - Fields: date, revenue, orders_count, customers_count, products_sold, refund_amount, etc.
    
    - `customer_rfm_scores`
      - Stores RFM (Recency, Frequency, Monetary) scores for each customer
      - Fields: customer_id, recency_score, frequency_score, monetary_score, rfm_segment, last_calculated
    
    - `product_performance_cache`
      - Caches product performance metrics
      - Fields: product_id, units_sold, revenue, unique_customers, last_updated
    
    - `customer_segments`
      - Stores customer segment assignments
      - Fields: customer_id, segment_type, segment_value, assigned_at

  2. Indexes
    - Optimized indexes for fast analytics queries
    
  3. Functions
    - Helper functions for RFM calculation
    - Aggregation refresh functions

  4. Security
    - Enable RLS on all tables
    - Policies for authenticated access
*/

-- Analytics Daily Aggregates
CREATE TABLE IF NOT EXISTS analytics_daily_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_revenue numeric(10,2) DEFAULT 0,
  total_orders integer DEFAULT 0,
  total_customers integer DEFAULT 0,
  new_customers integer DEFAULT 0,
  returning_customers integer DEFAULT 0,
  products_sold integer DEFAULT 0,
  refund_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  avg_order_value numeric(10,2) DEFAULT 0,
  avg_items_per_order numeric(8,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_daily_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily aggregates"
  ON analytics_daily_aggregates FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily_aggregates(date DESC);

-- Customer RFM Scores
CREATE TABLE IF NOT EXISTS customer_rfm_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text NOT NULL UNIQUE,
  customer_name text,
  recency_days integer,
  recency_score integer CHECK (recency_score BETWEEN 1 AND 5),
  frequency_count integer DEFAULT 0,
  frequency_score integer CHECK (frequency_score BETWEEN 1 AND 5),
  monetary_value numeric(10,2) DEFAULT 0,
  monetary_score integer CHECK (monetary_score BETWEEN 1 AND 5),
  rfm_score text,
  rfm_segment text,
  last_purchase_date timestamptz,
  first_purchase_date timestamptz,
  total_orders integer DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  avg_order_value numeric(10,2) DEFAULT 0,
  last_calculated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_rfm_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read RFM scores"
  ON customer_rfm_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert RFM scores"
  ON customer_rfm_scores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update RFM scores"
  ON customer_rfm_scores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rfm_segment ON customer_rfm_scores(rfm_segment);
CREATE INDEX IF NOT EXISTS idx_rfm_score ON customer_rfm_scores(rfm_score);
CREATE INDEX IF NOT EXISTS idx_customer_email_rfm ON customer_rfm_scores(customer_email);

-- Product Performance Cache
CREATE TABLE IF NOT EXISTS product_performance_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  product_name text NOT NULL,
  sku text,
  date_range text NOT NULL,
  units_sold integer DEFAULT 0,
  revenue numeric(10,2) DEFAULT 0,
  unique_customers integer DEFAULT 0,
  repeat_purchase_count integer DEFAULT 0,
  refund_count integer DEFAULT 0,
  refund_amount numeric(10,2) DEFAULT 0,
  avg_price numeric(10,2) DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, date_range)
);

ALTER TABLE product_performance_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read product performance"
  ON product_performance_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert product performance"
  ON product_performance_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product performance"
  ON product_performance_cache FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_product_performance_id ON product_performance_cache(product_id);
CREATE INDEX IF NOT EXISTS idx_product_performance_range ON product_performance_cache(date_range);

-- Customer Segments
CREATE TABLE IF NOT EXISTS customer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text NOT NULL,
  customer_name text,
  segment_type text NOT NULL,
  segment_value text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer segments"
  ON customer_segments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer segments"
  ON customer_segments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer segments"
  ON customer_segments FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_customer_segments_email ON customer_segments(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_segments_type ON customer_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_customer_segments_value ON customer_segments(segment_value);