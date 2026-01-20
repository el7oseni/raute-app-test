-- Check the status of orders and their GPS coordinates
-- This will help diagnose why assigned orders are not showing on the map

-- 1. Count orders by status
SELECT 
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN driver_id IS NOT NULL THEN 1 END) as assigned_count,
    COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_gps,
    COUNT(CASE WHEN driver_id IS NOT NULL AND (latitude IS NULL OR longitude IS NULL) THEN 1 END) as assigned_no_gps
FROM orders
GROUP BY status
ORDER BY count DESC;

-- 2. Show assigned orders without GPS coordinates
SELECT 
    id,
    order_number,
    customer_name,
    address,
    status,
    driver_id,
    latitude,
    longitude,
    route_index
FROM orders
WHERE driver_id IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL)
ORDER BY created_at DESC
LIMIT 20;

-- 3. Show all assigned orders (to check their status)
SELECT 
    id,
    order_number,
    customer_name,
    address,
    status,
    driver_id,
    latitude,
    longitude,
    route_index
FROM orders
WHERE driver_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 4. Count active orders (should match Fleet Command display)
SELECT COUNT(*) as active_orders
FROM orders
WHERE status NOT IN ('delivered', 'cancelled');

-- 5. Count assigned active orders with GPS
SELECT COUNT(*) as should_show_on_map
FROM orders
WHERE driver_id IS NOT NULL
  AND status NOT IN ('delivered', 'cancelled')
  AND latitude IS NOT NULL 
  AND longitude IS NOT NULL;
