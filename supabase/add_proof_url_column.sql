-- ============================================
-- ADD PROOF_URL COLUMN TO ORDERS
-- ============================================

-- Check if column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'proof_url') THEN
        ALTER TABLE orders ADD COLUMN proof_url TEXT;
    END IF;
END $$;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'proof_url';
