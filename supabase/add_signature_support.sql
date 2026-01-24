-- Add signature columns to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS signature_url text,
ADD COLUMN IF NOT EXISTS signature_required boolean DEFAULT false;

-- Create storage policy for signatures if not already covered by proofs
-- (Assuming we reuse 'proofs' bucket which usually allows public read / auth upload)
