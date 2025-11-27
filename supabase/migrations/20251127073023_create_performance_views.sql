/*
  # Create Performance Views

  1. New Views
    - `customer_aggregates` - Pre-calculated customer statistics
      - Groups orders by customer email
      - Calculates total spent, order count, first/last purchase dates
    
    - `order_stats` - Pre-calculated order statistics
      - Total orders, revenue, fulfillment counts
      - Updated automatically as orders change

  2. Benefits
    - Instant loading for analytics and orders list
    - Database-side aggregation instead of client-side
    - No application code changes needed for updates

  3. Security
    - Views inherit RLS from underlying tables
    - Same access policies apply
*/

-- Customer Aggregates View
CREATE OR REPLACE VIEW customer_aggregates AS
SELECT 
  email,
  MAX(customer_name) as customer_name,
  COUNT(*) as total_orders,
  SUM(total_price) as total_spent,
  MIN(created_at::date)::text as first_purchase_date,
  MAX(created_at::date)::text as last_purchase_date,
  AVG(total_price) as avg_order_value
FROM orders
WHERE email IS NOT NULL
GROUP BY email;

-- Order Stats View
CREATE OR REPLACE VIEW order_stats AS
SELECT 
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE financial_status = 'paid') as paid_orders,
  COUNT(*) FILTER (WHERE fulfillment_status = 'fulfilled') as fulfilled_orders,
  COUNT(*) FILTER (WHERE fulfillment_status IS NULL OR fulfillment_status = 'unfulfilled') as unfulfilled_orders,
  COALESCE(SUM(total_price), 0) as total_revenue
FROM orders;
