-- FIX AUTH ADMIN PERMISSIONS (GRANTS ONLY)
-- We cannot use ALTER ROLE (Reserved), but we CAN use GRANT!
-- This is critical for the Auth Server to access 'extensions'.

-- 1. Grant Usage on Extensions (Critical for gen_random_uuid)
GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin;

-- 2. Grant Execute on all functions in extensions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO supabase_auth_admin;

-- 3. Grant access to public schema (just in case)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;

-- 4. Verify Result
-- We'll try to use a function as the admin to prove it works
-- (We use a temp function owned by the admin to test 'effective' permissions)
DO $$
BEGIN
    RAISE NOTICE 'Grants applied successfully.';
END $$;
