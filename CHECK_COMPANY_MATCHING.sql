-- FINAL DIAGNOSTIC: Check company_id matching
-- This will show if the logged-in user's company_id matches orders/drivers

-- 1. Get the logged-in user's company_id
SELECT 
    id,
    email,
    role,
    company_id
FROM public.users
WHERE id = '028f6d5f-add5-4d64-9af2-dbc5d5302a20';

-- 2. Count orders and drivers by company_id
SELECT 
    company_id,
    COUNT(*) as count,
    'orders' as type
FROM orders
GROUP BY company_id
UNION ALL
SELECT 
    company_id,
    COUNT(*) as count,
    'drivers' as type
FROM drivers
GROUP BY company_id
ORDER BY type, company_id;

-- 3. THE CRITICAL QUERY: Do orders/drivers belong to the same company as the user?
SELECT 
    u.email as logged_in_user,
    u.company_id as user_company_id,
    c.name as user_company_name,
    COUNT(DISTINCT o.id) as orders_in_same_company,
    COUNT(DISTINCT d.id) as drivers_in_same_company,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM drivers) as total_drivers
FROM public.users u
LEFT JOIN companies c ON c.id = u.company_id
LEFT JOIN orders o ON o.company_id = u.company_id
LEFT JOIN drivers d ON d.company_id = u.company_id
WHERE u.id = '028f6d5f-add5-4d64-9af2-dbc5d5302a20'
GROUP BY u.email, u.company_id, c.name;

-- 4. SOLUTION: If company_id is different, update orders and drivers
-- First, see what company_id the user has:
-- Then run this (REPLACE with actual company_id):

/*
-- If user's company_id is different from orders/drivers, 
-- Option A: Update ALL orders to match user's company:
UPDATE orders
SET company_id = (
    SELECT company_id FROM users WHERE id = '028f6d5f-add5-4d64-9af2-dbc5d5302a20'
);

-- Option B: Update ALL drivers to match user's company:
UPDATE drivers
SET company_id = (
    SELECT company_id FROM users WHERE id = '028f6d5f-add5-4d64-9af2-dbc5d5302a20'
);
*/

-- OR Option C: Update the user's company_id to match orders/drivers:
/*
-- Get the most common company_id from orders:
SELECT company_id, COUNT(*) FROM orders GROUP BY company_id ORDER BY COUNT(*) DESC LIMIT 1;

-- Then update user:
UPDATE users
SET company_id = 'COMPANY_ID_FROM_ORDERS'
WHERE id = '028f6d5f-add5-4d64-9af2-dbc5d5302a20';
*/
