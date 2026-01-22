-- Fix RLS Policy for Driver Self-Access
-- Problem: Drivers cannot read their own records from drivers table
-- Solution: Add policy allowing drivers to see themselves via user_id match

-- Step 1: Check existing policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'drivers';

-- Step 2: Drop old restrictive policy if exists
DROP POLICY IF EXISTS "Company drivers access" ON public.drivers;

-- Step 3: Create separate policies for clarity

-- Managers can see all drivers in their company
CREATE POLICY "Managers see company drivers"
    ON public.drivers
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE auth.uid() = id AND role = 'manager'
        )
    );

-- Drivers can see their own record
CREATE POLICY "Drivers see themselves"
    ON public.drivers
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- Step 4: Verify policies were created
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'drivers'
ORDER BY policyname;
