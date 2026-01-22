-- ============================================
-- VERIFY DRIVER LOCATION DATA
-- ============================================
-- Check if driver coordinates are being saved correctly

-- 1. Check all drivers with their location data
SELECT 
    id,
    name,
    is_online,
    current_lat,
    current_lng,
    last_location_update,
    idle_since,
    battery_level
FROM drivers
ORDER BY last_location_update DESC NULLS LAST;

-- 2. Check only online drivers with coordinates
SELECT 
    id,
    name,
    is_online,
    current_lat,
    current_lng,
    last_location_update
FROM drivers
WHERE is_online = true 
AND current_lat IS NOT NULL 
AND current_lng IS NOT NULL;

-- 3. Check driver_locations table for recent tracking data
SELECT 
    dl.driver_id,
    d.name,
    dl.latitude,
    dl.longitude,
    dl.accuracy,
    dl.timestamp
FROM driver_locations dl
LEFT JOIN drivers d ON d.id = dl.driver_id
ORDER BY dl.timestamp DESC
LIMIT 10;

-- 4. Check RLS policies on drivers table (might be blocking updates)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'drivers'
ORDER BY policyname;
