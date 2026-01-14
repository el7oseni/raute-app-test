-- EMERGENCY FIX
-- Stop ALL automation on public.users temporarily to isolate the problem

-- 1. DISABLE RLS completely (temporary)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. DROP all policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view company members" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow public signup - insert user" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their company" ON public.users;

-- 3. DROP triggers on public.users
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- 4. Grant basic permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO supabase_auth_admin;
