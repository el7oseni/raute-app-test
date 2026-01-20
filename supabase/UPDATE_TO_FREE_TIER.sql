-- ============================================
-- UPDATE ALL EXISTING USERS TO FREE TIER (1 DRIVER)
-- ============================================

BEGIN;

-- Update all manager/admin users who have driver_limit = 5 to driver_limit = 1
-- (We assume users with limit > 5 have paid subscriptions)
UPDATE public.users
SET driver_limit = 1
WHERE role IN ('manager', 'admin')
AND (driver_limit IS NULL OR driver_limit = 5);

-- Show the results
SELECT 
    'Updated!' as status,
    COUNT(*) as users_updated
FROM public.users
WHERE role IN ('manager', 'admin')
AND driver_limit = 1;

-- Verification: Show all managers and their driver limits
SELECT 
    u.email,
    u.full_name,
    u.role,
    u.driver_limit,
    c.name as company_name,
    COUNT(d.id) as current_drivers
FROM public.users u
LEFT JOIN public.companies c ON c.id = u.company_id
LEFT JOIN public.drivers d ON d.company_id = u.company_id
WHERE u.role IN ('manager', 'admin')
GROUP BY u.id, u.email, u.full_name, u.role, u.driver_limit, c.name
ORDER BY u.created_at DESC
LIMIT 20;

COMMIT;

SELECT '✅ All existing users now have driver_limit = 1 (Free Tier)' as final_status;
SELECT '⚠️ Note: Users who exceed this limit will need to upgrade.' as note;
