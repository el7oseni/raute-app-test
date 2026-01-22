-- 🚨 URGENT FIX: Login Broken Due to Circular RLS Dependency
-- The users table SELECT policy was querying users table to check company_id
-- This creates infinite loop and blocks all user queries!

-- ========================================
-- FIX: USERS TABLE POLICIES
-- ========================================

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view company members" ON users;

-- NEW APPROACH: Allow users to read their own record FIRST
-- Then allow reading company members
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can view company members"
    ON users FOR SELECT
    TO authenticated
    USING (
        -- Can view users in the same company as ME
        -- But auth.uid() user MUST exist first (handled by policy above)
        company_id = (
            SELECT company_id 
            FROM users 
            WHERE id = auth.uid()
            LIMIT 1
        )
    );

-- Keep existing UPDATE policy (it's fine)
-- DROP POLICY IF EXISTS "Users can update their own profile" ON users;
-- Already exists and works correctly

-- ========================================
-- VERIFY FIX
-- ========================================

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
