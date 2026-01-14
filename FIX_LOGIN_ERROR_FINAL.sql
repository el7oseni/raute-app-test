-- FIX LOGIN ERROR FINAL (COMPREHENSIVE FIX)
-- This script addresses the "Database error querying schema" (500) during login.
-- It ensures that the internal Auth roles (supabase_auth_admin, service_role)
-- have full access to the public schema and tables, bypassing RLS if necessary.

BEGIN;

-- 1. Grant BYPASSRLS to the Auth Admin role
-- This is critical because Auth Triggers run as the user (who might not have access yet)
-- OR as supabase_auth_admin. If it's the latter, it MUST bypass RLS to read/write custom user data.
DO $$
BEGIN
    ALTER ROLE supabase_auth_admin WITH BYPASSRLS;
    RAISE NOTICE 'Success: BYPASSRLS granted to supabase_auth_admin';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Warning: Could not set BYPASSRLS (likely due to restricted permissions on this instance). Proceeding with Policy fallback...';
END $$;

-- 2. Grant Schema Usage causing "permission denied" errors hidden in logs
GRANT USAGE ON SCHEMA public TO supabase_auth_admin, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO supabase_auth_admin, service_role;

-- 3. Create a "Fallback Policy" for Auth Admin
-- If BYPASSRLS failed above, this Policy explicitly allows the admin to do ANYTHING on public.users.
DO $$
BEGIN
    -- Drop potentially conflicting old policies for this specific role
    EXECUTE 'DROP POLICY IF EXISTS "Auth Admin System Access" ON public.users';
    
    -- Create the permissive policy
    EXECUTE 'CREATE POLICY "Auth Admin System Access" ON public.users 
             AS PERMISSIVE FOR ALL 
             TO supabase_auth_admin 
             USING (true) 
             WITH CHECK (true)';
             
    RAISE NOTICE 'Success: Fallback Policy created for supabase_auth_admin';
END $$;

-- 4. Ensure Standard Authenticated User Policies exist
-- Sometimes these get deleted by mistake, locking users out of their own rows.
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 5. Enable RLS (Just in case it was disabled and left in a weird state)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

COMMIT;

SELECT 'Fix Applied Successfully. Try logging in again.' as result;
