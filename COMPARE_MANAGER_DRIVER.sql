-- COMPARE MANAGER (Working) VS DRIVER (Broken)

WITH manager_data AS (
    SELECT 
        'Manager' as type,
        au.id,
        au.email,
        au.role as auth_role,
        au.raw_app_meta_data,
        au.raw_user_meta_data,
        au.is_super_admin,
        au.confirmed_at IS NOT NULL as is_confirmed,
        pu.role as public_role,
        pu.company_id
    FROM auth.users au
    JOIN public.users pu ON pu.id = au.id
    WHERE pu.role = 'manager'
    LIMIT 1
),
driver_data AS (
    SELECT 
        'Driver' as type,
        au.id,
        au.email,
        au.role as auth_role,
        au.raw_app_meta_data,
        au.raw_user_meta_data,
        au.is_super_admin,
        au.confirmed_at IS NOT NULL as is_confirmed,
        pu.role as public_role,
        pu.company_id
    FROM auth.users au
    JOIN public.users pu ON pu.id = au.id
    WHERE au.email = 'loloz@gmail.com' -- The broken driver
)
SELECT * FROM manager_data
UNION ALL
SELECT * FROM driver_data;

-- ALSO CHECK: Are there triggers on auth.sessions?
-- A failure here would crash the Token endpoint (500)
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
AND event_object_table = 'sessions';
