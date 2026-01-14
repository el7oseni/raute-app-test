-- CRITICAL TEST: Run as "supabase_auth_admin"
-- The SQL Editor runs as superuser (postgres), so it works fine.
-- But the Auth Server runs as "supabase_auth_admin".
-- We need to see if THIS role is failing.

DO $$
BEGIN
    RAISE NOTICE '--- SWITCHING TO AUTH ADMIN ROLE ---';
    
    -- 1. Switch Role
    SET ROLE supabase_auth_admin;

    -- 2. Try the Update (on our test user)
    UPDATE auth.users 
    SET last_sign_in_at = now() 
    WHERE email = 'test_clean@gmail.com';

    RAISE NOTICE '--- SUCCESS: Auth Admin has permission ---';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '--- FAILURE: Auth Admin CANNOT update! ---';
    RAISE NOTICE 'Error Code: %', SQLSTATE;
    RAISE NOTICE 'Error Message: %', SQLERRM;
END $$;

RESET ROLE;

-- 3. List Triggers on auth.users (to see if any interfere)
SELECT 
    trigger_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';
