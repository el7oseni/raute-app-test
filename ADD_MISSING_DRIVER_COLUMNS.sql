-- Add missing columns to drivers table
-- These columns are needed for the map functionality

-- Step 1: Check current columns in drivers table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'drivers'
ORDER BY ordinal_position;

-- Step 2: Add is_online column (for tracking driver online status)
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Step 3: Add location tracking columns (if missing)
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS current_lat FLOAT;

ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS current_lng FLOAT;

ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE;

-- Step 4: Set all active drivers to online
UPDATE drivers
SET is_online = true
WHERE status = 'active';

-- Step 5: Set a default location for drivers (optional - Los Angeles area)
-- Uncomment if you want drivers to have a default location:
/*
UPDATE drivers
SET 
    current_lat = 34.0522 + (RANDOM() * 0.1 - 0.05),  -- Random offset ±0.05 degrees
    current_lng = -118.2437 + (RANDOM() * 0.1 - 0.05),
    last_location_update = NOW()
WHERE current_lat IS NULL OR current_lng IS NULL;
*/

-- Step 6: Verify the changes
SELECT 
    id,
    name,
    status,
    is_online,
    current_lat,
    current_lng,
    last_location_update
FROM drivers
ORDER BY name;

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online);
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers(current_lat, current_lng) WHERE current_lat IS NOT NULL;

-- Done! Now drivers should appear online on the map.
