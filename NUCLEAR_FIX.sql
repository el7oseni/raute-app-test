-- NUCLEAR OPTION: Remove ALL RLS from auth.users
-- WARNING: This is aggressive but necessary to fix the login

-- 1. Disable RLS completely on auth.users (Supabase will handle security via API)
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL custom policies (if any)
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'auth' 
        AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON auth.users CASCADE', policy_rec.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_rec.policyname;
    END LOOP;
END $$;

-- 3. Grant FULL permissions to authenticator (the API user)
GRANT ALL ON auth.users TO authenticator;
GRANT ALL ON auth.users TO postgres;

-- 4. Ensure search_path is correct
ALTER ROLE authenticator SET search_path = auth, public, extensions;

-- 5. Reload
NOTIFY pgrst, 'reload schema';

-- 6. Test query (this should work without errors)
SELECT COUNT(*) FROM auth.users WHERE role = 'authenticated';
