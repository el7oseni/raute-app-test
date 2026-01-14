-- FIX RLS POLICIES on public.users
-- This ensures authenticated users can read their own data

-- Step 1: Drop all existing policies on public.users
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_rec.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_rec.policyname;
    END LOOP;
END $$;

-- Step 2: Create correct policies for authenticated users
-- Users can read their own data
CREATE POLICY "Users can read own data"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Managers can read all users in their company
CREATE POLICY "Managers can read company users"
ON public.users
FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid() AND role = 'manager'
    )
);

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Grant necessary permissions
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- Step 5: Verify - try to read a driver's data
SELECT 'Verification:' as status, email, role, status 
FROM public.users 
WHERE email = 'loloz@gmail.com';
