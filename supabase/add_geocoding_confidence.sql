-- Add geocoding verification fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS geocoding_confidence TEXT DEFAULT 'exact' CHECK (geocoding_confidence IN ('exact', 'approximate', 'low', 'failed')),
ADD COLUMN IF NOT EXISTS geocoded_address TEXT,
ADD COLUMN IF NOT EXISTS geocoding_attempted_at TIMESTAMPTZ;

-- Add index for quickly finding unverified orders
CREATE INDEX IF NOT EXISTS idx_orders_geocoding_confidence 
ON orders(geocoding_confidence) 
WHERE geocoding_confidence != 'exact';
