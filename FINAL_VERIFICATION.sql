-- Final verification query - Run this to see what data exists
-- This will show us EXACTLY what should appear on the map

-- 1. Check drivers with their online status and location
SELECT 
    name,
    status,
    is_online,
    current_lat,
    current_lng,
    company_id
FROM drivers
ORDER BY name;

-- 2. Check orders with their status and location
SELECT 
    order_number,
    customer_name,
    status,
    driver_id,
    latitude,
    longitude,
    company_id
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check what SHOULD show on map (active orders with GPS)
SELECT 
    COUNT(*) as should_show_on_map
FROM orders
WHERE status NOT IN ('delivered', 'cancelled')
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- 4. Check online drivers count
SELECT 
    COUNT(*) as online_drivers
FROM drivers
WHERE is_online = true;

-- 5. Most important: Check company_id matching
-- Get the current user's company_id
SELECT company_id FROM users LIMIT 1;

-- Then check if orders and drivers have the SAME company_id
SELECT 
    'Orders' as type,
    company_id,
    COUNT(*) as count
FROM orders
GROUP BY company_id
UNION ALL
SELECT 
    'Drivers' as type,
    company_id,
    COUNT(*) as count
FROM drivers
GROUP BY company_id;
