-- Check why drivers show as offline and why orders don't appear on map
-- Based on the screenshots provided

-- 1. Check driver online status
SELECT 
    id,
    name,
    email,
    status,
    is_online,
    current_lat,
    current_lng,
    last_location_update
FROM drivers
ORDER BY name;

-- 2. Check order statuses (exact values)
SELECT 
    order_number,
    customer_name,
    status,
    driver_id,
    latitude,
    longitude,
    created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if driver_id in orders matches actual driver IDs
SELECT 
    o.order_number,
    o.status as order_status,
    o.driver_id,
    d.name as driver_name,
    d.status as driver_status,
    d.is_online,
    CASE 
        WHEN o.driver_id IS NULL THEN '❌ Not Assigned'
        WHEN d.id IS NULL THEN '⚠️ Driver not found!'
        WHEN d.is_online = false OR d.is_online IS NULL THEN '📴 Driver Offline'
        ELSE '✅ OK'
    END as issue
FROM orders o
LEFT JOIN drivers d ON d.id = o.driver_id
WHERE o.status NOT IN ('delivered', 'cancelled')
ORDER BY o.created_at DESC;

-- 4. Update all drivers to be online (SOLUTION)
-- Uncomment to run:
/*
UPDATE drivers
SET is_online = true
WHERE status = 'active';
*/

-- 5. Check what exact status values exist in orders
SELECT DISTINCT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;
