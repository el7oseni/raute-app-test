-- TEMPORARY TEST: Disable RLS to confirm it's the issue
-- If login works after this, we know RLS is the problem

-- Temporarily disable RLS on public.users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Try login now - it should work!
-- After confirming login works, come back and re-enable RLS with proper policies
