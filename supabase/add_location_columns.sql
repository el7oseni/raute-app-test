-- ============================================
-- ADD MISSING LOCATION TRACKING COLUMNS
-- ============================================
-- This script adds the missing columns to the drivers table
-- that are needed for location tracking to work properly

-- 1. Add idle_since column (tracks when driver stopped moving)
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS idle_since TIMESTAMPTZ;

-- 2. Add battery_level column (tracks driver's device battery)
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS battery_level INTEGER;

-- 3. Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'drivers'
AND column_name IN ('idle_since', 'battery_level', 'current_lat', 'current_lng', 'last_location_update', 'is_online')
ORDER BY column_name;

-- 4. Test update query (should work now without 400 error)
-- UPDATE drivers 
-- SET current_lat = 31.113, 
--     current_lng = 30.940, 
--     last_location_update = NOW(),
--     idle_since = NULL,
--     battery_level = 85
-- WHERE id = 'your-driver-id';
