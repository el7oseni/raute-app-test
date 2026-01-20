-- ============================================
-- ADD DRIVER LIMIT COLUMN TO USERS (OR PUBLIC.COMPANIES)
-- ============================================

-- Check if column exists, if not add it to 'users' table (simplest for now)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'driver_limit') THEN
        ALTER TABLE users ADD COLUMN driver_limit INTEGER DEFAULT 1;
    END IF;
END $$;

-- Verify
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'driver_limit';
