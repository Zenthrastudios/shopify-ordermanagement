/*
  # Fix Customer Aggregates Grouping

  1. Changes
    - Drop old customer_aggregates view
    - Create new view that groups by BOTH email AND customer_name
    - This prevents mixing orders from different customers with same email

  2. Why This Fix
    - Multiple customers had "no-email@example.com" 
    - Old view grouped by email only, causing miscalculations
    - New view treats each customer_name + email combo uniquely
*/

-- Drop the old view
DROP VIEW IF EXISTS customer_aggregates;

-- Create improved view that groups by both email AND customer name
CREATE OR REPLACE VIEW customer_aggregates AS
SELECT 
  email,
  customer_name,
  COUNT(*) as total_orders,
  SUM(total_price) as total_spent,
  MIN(created_at::date)::text as first_purchase_date,
  MAX(created_at::date)::text as last_purchase_date,
  AVG(total_price) as avg_order_value
FROM orders
WHERE email IS NOT NULL AND customer_name IS NOT NULL
GROUP BY email, customer_name;
