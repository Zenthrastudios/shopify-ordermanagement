/*
  # Add Tracking Partners Management

  1. New Tables
    - `tracking_partners`
      - `id` (uuid, primary key)
      - `name` (text) - Carrier name (e.g., "Delhivery", "Blue Dart")
      - `tracking_url_template` (text) - URL template with {tracking_number} placeholder
      - `is_active` (boolean) - Whether this partner is active
      - `is_default` (boolean) - Whether this is the default carrier
      - `display_order` (integer) - Sort order for display
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `tracking_partners` table
    - Add policies for authenticated users to read
    - Add policies for authenticated users to manage tracking partners

  3. Default Data
    - Insert default tracking partners with common Indian carriers
*/

CREATE TABLE IF NOT EXISTS tracking_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tracking_url_template text NOT NULL,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tracking_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to tracking partners"
  ON tracking_partners
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert tracking partners"
  ON tracking_partners
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update tracking partners"
  ON tracking_partners
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete tracking partners"
  ON tracking_partners
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default tracking partners
INSERT INTO tracking_partners (name, tracking_url_template, is_active, is_default, display_order) VALUES
  ('Delhivery', 'https://www.delhivery.com/track/package/{tracking_number}', true, true, 1),
  ('Blue Dart', 'https://www.bluedart.com/tracking/{tracking_number}', true, false, 2),
  ('DTDC', 'https://www.dtdc.in/tracking/{tracking_number}', true, false, 3),
  ('FedEx', 'https://www.fedex.com/fedextrack/?trknbr={tracking_number}', true, false, 4),
  ('Ekart', 'https://ekartlogistics.com/track/{tracking_number}', true, false, 5),
  ('India Post', 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentno={tracking_number}', true, false, 6),
  ('Ecom Express', 'https://ecomexpress.in/tracking/?awb={tracking_number}', true, false, 7),
  ('Shadowfax', 'https://shadowfax.in/track/{tracking_number}', true, false, 8),
  ('UPS', 'https://www.ups.com/track?tracknum={tracking_number}', true, false, 9),
  ('DHL', 'https://www.dhl.com/in-en/home/tracking.html?tracking-id={tracking_number}', true, false, 10),
  ('Aramex', 'https://www.aramex.com/track/results?ShipmentNumber={tracking_number}', true, false, 11)
ON CONFLICT DO NOTHING;
