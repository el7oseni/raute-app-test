-- FINAL COMPREHENSIVE FIX
-- Re-enable RLS but with CORRECT policies that won't crash

-- 1. Enable RLS on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Create SIMPLE, SAFE policies
-- Policy 1: Everyone can read their own profile (bypasses RLS check)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    TO authenticated, anon
    USING (id = auth.uid());

-- Policy 2: Service role can do anything (for triggers)
DROP POLICY IF EXISTS "users_service_all" ON public.users;
CREATE POLICY "users_service_all" ON public.users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 3: Allow INSERT for signup (anon can insert during registration)
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (id = auth.uid());

-- Policy 4: Update own profile
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 3. Grant permissions explicitly
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT ON public.users TO anon;
GRANT ALL ON public.users TO service_role;
