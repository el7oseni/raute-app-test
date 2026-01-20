-- Link the new user to the company with orders and drivers
-- This is the final step to complete the setup

DO $$
DECLARE
    new_user_id UUID := '75032d17-4f2d-40d1-a34d-4c8c9f54fbdc';
    target_company_id UUID := '43365bc6-c803-464a-a65a-22ba2a6482f7';
BEGIN
    -- Insert or update user in public.users
    INSERT INTO public.users (id, company_id, email, full_name, role, status)
    VALUES (
        new_user_id,
        target_company_id,
        'testmanager@test.com',
        'Test Manager',
        'manager',
        'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        company_id = target_company_id,
        role = 'manager',
        status = 'active';
    
    RAISE NOTICE 'User successfully linked to company!';
    RAISE NOTICE 'User ID: %', new_user_id;
    RAISE NOTICE 'Company ID: %', target_company_id;
END $$;

-- Verify the setup:
SELECT 
    u.email as user_email,
    u.role,
    u.company_id as user_company,
    c.name as company_name,
    COUNT(DISTINCT o.id) as orders_count,
    COUNT(DISTINCT d.id) as drivers_count,
    COUNT(DISTINCT CASE WHEN o.status NOT IN ('delivered', 'cancelled') THEN o.id END) as active_orders,
    COUNT(DISTINCT CASE WHEN d.is_online = true THEN d.id END) as online_drivers
FROM public.users u
JOIN companies c ON c.id = u.company_id
LEFT JOIN orders o ON o.company_id = u.company_id
LEFT JOIN drivers d ON d.company_id = u.company_id
WHERE u.email = 'testmanager@test.com'
GROUP BY u.email, u.role, u.company_id, c.name;

-- Expected output:
-- - role = 'manager'
-- - orders_count should be > 0
-- - drivers_count should be > 0
-- - active_orders should be around 5
-- - online_drivers should be around 3

-- If everything looks good, you can now login and go to /map!
