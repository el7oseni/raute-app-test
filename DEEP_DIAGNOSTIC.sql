-- Deep diagnostic: Why orders aren't showing on map even with GPS

-- 1. Show ALL active orders with their details
SELECT 
    id,
    order_number,
    customer_name,
    address,
    status,
    driver_id,
    latitude,
    longitude,
    route_index,
    created_at
FROM orders
WHERE status NOT IN ('delivered', 'cancelled')
ORDER BY created_at DESC;

-- 2. Count orders by driver_id
SELECT 
    COALESCE(d.name, 'UNASSIGNED') as driver_name,
    COUNT(o.id) as order_count,
    COUNT(CASE WHEN o.latitude IS NOT NULL AND o.longitude IS NOT NULL THEN 1 END) as with_gps,
    STRING_AGG(o.status, ', ') as statuses
FROM orders o
LEFT JOIN drivers d ON d.id = o.driver_id
WHERE o.status NOT IN ('delivered', 'cancelled')
GROUP BY d.name, o.driver_id
ORDER BY order_count DESC;

-- 3. Show driver details
SELECT 
    id,
    name,
    is_online,
    current_lat,
    current_lng,
    status as driver_status
FROM drivers
ORDER BY name;

-- 4. Detailed list of the 5 orders that should show
SELECT 
    o.order_number,
    o.customer_name,
    o.status as order_status,
    o.latitude,
    o.longitude,
    d.name as driver_name,
    d.is_online as driver_online,
    o.route_index
FROM orders o
LEFT JOIN drivers d ON d.id = o.driver_id
WHERE o.driver_id IS NOT NULL
  AND o.status NOT IN ('delivered', 'cancelled')
  AND o.latitude IS NOT NULL 
  AND o.longitude IS NOT NULL
ORDER BY d.name, o.route_index;

-- 5. Check if there's a company_id mismatch (RLS issue)
SELECT 
    o.id,
    o.order_number,
    o.company_id as order_company,
    d.company_id as driver_company,
    CASE 
        WHEN o.company_id != d.company_id THEN '⚠️ MISMATCH'
        ELSE '✓ OK'
    END as company_check
FROM orders o
LEFT JOIN drivers d ON d.id = o.driver_id
WHERE o.driver_id IS NOT NULL
  AND o.status NOT IN ('delivered', 'cancelled')
LIMIT 20;

-- 6. Check user's role (for RLS permissions)
SELECT 
    u.id,
    u.email,
    u.role,
    u.company_id,
    c.name as company_name
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid())
LIMIT 1;
