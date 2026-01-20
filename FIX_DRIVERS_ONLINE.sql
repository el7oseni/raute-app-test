-- SOLUTION: Fix drivers online status and verify data
-- Run this to make drivers appear online and orders visible on map

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: Make all active drivers ONLINE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UPDATE drivers
SET is_online = true
WHERE status = 'active';

-- Check result:
SELECT name, status, is_online FROM drivers;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: Verify orders have correct status (lowercase)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Check if any orders have UPPERCASE status (wrong)
SELECT order_number, status, driver_id
FROM orders
WHERE status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');

-- If any found, fix them:
/*
UPDATE orders SET status = LOWER(status);
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 3: Verify company_id matching
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
    'Orders' as table_name,
    company_id,
    COUNT(*) as count
FROM orders
GROUP BY company_id
UNION ALL
SELECT 
    'Drivers' as table_name,
    company_id,
    COUNT(*) as count
FROM drivers
GROUP BY company_id;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 4: Add default location to drivers (if missing)
-- This helps them appear on the map
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Check which drivers don't have location
SELECT name, current_lat, current_lng
FROM drivers
WHERE current_lat IS NULL OR current_lng IS NULL;

-- Set a default location (Los Angeles) for drivers without location
-- Uncomment to run:
/*
UPDATE drivers
SET 
    current_lat = 34.0522,
    current_lng = -118.2437,
    last_location_update = NOW()
WHERE current_lat IS NULL OR current_lng IS NULL;
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 5: Final verification - what should appear on map
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Orders that should show on map:
SELECT 
    o.order_number,
    o.customer_name,
    o.status,
    o.latitude,
    o.longitude,
    d.name as driver_name,
    d.is_online as driver_online
FROM orders o
LEFT JOIN drivers d ON d.id = o.driver_id
WHERE o.status NOT IN ('delivered', 'cancelled')
  AND o.latitude IS NOT NULL
  AND o.longitude IS NOT NULL
ORDER BY d.name, o.route_index;

-- Count by status:
SELECT 
    COUNT(*) as total_active_orders,
    COUNT(CASE WHEN driver_id IS NOT NULL THEN 1 END) as assigned,
    COUNT(CASE WHEN driver_id IS NULL THEN 1 END) as unassigned,
    COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_gps
FROM orders
WHERE status NOT IN ('delivered', 'cancelled');

-- Driver summary:
SELECT 
    name,
    is_online,
    current_lat IS NOT NULL AND current_lng IS NOT NULL as has_location,
    (SELECT COUNT(*) FROM orders WHERE driver_id = drivers.id AND status NOT IN ('delivered', 'cancelled')) as active_orders
FROM drivers
ORDER BY name;
