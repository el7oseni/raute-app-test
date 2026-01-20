-- Add missing latitude and longitude columns to hubs table
ALTER TABLE public.hubs 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Optionally: Add 'address' as alias/duplicate of 'location' for compatibility
-- (Or we can just rename 'location' to 'address')
-- Let's rename it to match the frontend expectations:
ALTER TABLE public.hubs 
RENAME COLUMN location TO address;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hubs'
ORDER BY ordinal_position;
