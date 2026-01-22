-- 🚨 CRITICAL FIX: Clean up duplicate/conflicting policies on users table
-- The middleware is getting blocked by conflicting RLS policies!

-- ========================================
-- 1. DROP ALL POLICIES ON USERS TABLE
-- ========================================

DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view company members" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_service_all" ON users;

-- ========================================
-- 2. CREATE SIMPLE, WORKING POLICIES
-- ========================================

-- Allow users to read their own profile (CRITICAL for auth)
CREATE POLICY "users_can_read_own"
    ON users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Allow users to read company members (for app functionality)
CREATE POLICY "users_can_read_company"
    ON users FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Allow users to update their own profile
CREATE POLICY "users_can_update_own"
    ON users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ========================================
-- 3. VERIFY - Should show only 3 policies
-- ========================================

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' AND policyname = 'users_can_read_own' THEN '✅ Own profile'
        WHEN cmd = 'SELECT' AND policyname = 'users_can_read_company' THEN '✅ Company members'
        WHEN cmd = 'UPDATE' AND policyname = 'users_can_update_own' THEN '✅ Update own'
        ELSE '⚠️ Check this'
    END as purpose
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
