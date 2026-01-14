-- FIX AUTH ADMIN RLS (THE ROOT CAUSE)
-- 'supabase_auth_admin' does NOT bypass RLS by default.
-- If an Auth Hook queries 'public.users', it gets blocked by RLS!

DO $$
BEGIN
    -- 1. Try to set BYPASSRLS (Best Fix)
    -- This allows the auth server to read everything it needs.
    ALTER ROLE supabase_auth_admin WITH BYPASSRLS;
    RAISE NOTICE 'Success: BYPASSRLS granted to supabase_auth_admin';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Warning: Could not set BYPASSRLS (Reserved Role). Applying Policy Fix...';
    
    -- 2. Fallback: Add a Policy allowing Auth Admin to read EVERYTHING
    -- This checks if the current role is 'supabase_auth_admin' and lets it pass.
    
    EXECUTE 'DROP POLICY IF EXISTS "Auth Admin System Access" ON public.users';
    
    EXECUTE 'CREATE POLICY "Auth Admin System Access" ON public.users 
             AS PERMISSIVE FOR ALL 
             TO supabase_auth_admin 
             USING (true) 
             WITH CHECK (true)';
             
    RAISE NOTICE 'Success: RLS Policy created for supabase_auth_admin';
END $$;
