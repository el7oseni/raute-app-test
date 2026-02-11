-- ============================================================
-- FIX RLS INFINITE RECURSION ON USERS TABLE
-- ============================================================
-- Problem: A policy on public.users does a subquery on public.users
-- (e.g., SELECT company_id FROM users WHERE id = auth.uid())
-- which triggers the same policy again → infinite recursion → 500 error
--
-- Solution: Drop ALL existing policies on users, then create
-- only simple, non-recursive ones.
-- ============================================================

BEGIN;

-- Step 1: Drop ALL policies on public.users (nuclear cleanup)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 2: Create SIMPLE non-recursive policies
-- ✅ Self-read: No subquery on users table = NO recursion
CREATE POLICY "users_read_own"
ON public.users FOR SELECT TO authenticated
USING (id = auth.uid());

-- ✅ Self-update: No subquery = safe
CREATE POLICY "users_update_own"
ON public.users FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ✅ Company members read: Uses auth.uid() directly, 
-- but the subquery is on the SAME users table which CAN cause recursion.
-- SAFE FIX: Use a security definer function instead!

-- Step 3: Create a helper function that runs as SECURITY DEFINER
-- This function bypasses RLS when looking up the current user's company_id
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;

-- ✅ Company members read: Uses the SECURITY DEFINER function
-- so no recursive RLS check happens
CREATE POLICY "users_read_company"
ON public.users FOR SELECT TO authenticated
USING (company_id = public.get_my_company_id());

-- Step 4: Verify results
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%FROM%users%' THEN '✅ Safe (direct auth check)'
        WHEN qual::text LIKE '%get_my_company_id%' THEN '✅ Safe (uses SECURITY DEFINER function)'
        WHEN qual::text LIKE '%FROM%users%' THEN '❌ RECURSIVE! Fix needed!'
        ELSE '✅ Safe'
    END as safety_check
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY cmd, policyname;

COMMIT;

-- ============================================================
-- ALSO FIX: Update other tables that reference users via subquery
-- These are safe because they query users table which now has
-- the get_my_company_id() function. But let's be extra safe.
-- ============================================================

-- Fix drivers policies
DROP POLICY IF EXISTS "Users can view drivers in their company" ON drivers;
CREATE POLICY "Users can view drivers in their company"
ON drivers FOR SELECT TO authenticated
USING (company_id = public.get_my_company_id());

-- Fix orders policies  
DROP POLICY IF EXISTS "Users can view orders in their company" ON orders;
CREATE POLICY "Users can view orders in their company"
ON orders FOR SELECT TO authenticated
USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users can insert orders in their company" ON orders;
CREATE POLICY "Users can insert orders in their company"
ON orders FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users can update orders in their company" ON orders;
CREATE POLICY "Users can update orders in their company"
ON orders FOR UPDATE TO authenticated
USING (company_id = public.get_my_company_id());

-- Fix hubs policies
DROP POLICY IF EXISTS "Users can view hubs in their company" ON hubs;
CREATE POLICY "Users can view hubs in their company"
ON hubs FOR SELECT TO authenticated
USING (company_id = public.get_my_company_id());
