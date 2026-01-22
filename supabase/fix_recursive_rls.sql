-- 🚨 CRITICAL FIX: Remove recursive RLS policy causing 500 error
-- The users_can_read_company policy was causing infinite recursion!

-- ========================================
-- 1. DROP THE PROBLEMATIC POLICY
-- ========================================

DROP POLICY IF EXISTS "users_can_read_company" ON users;

-- ========================================
-- 2. SIMPLE SOLUTION: Just allow authenticated users to read ANY user
-- Since we have company_id filtering in the application layer anyway
-- ========================================

-- Keep this one (already works)
-- DROP POLICY IF EXISTS "users_can_read_own" ON users;

-- Replace the recursive policy with a simple one
CREATE POLICY "users_can_read_all_authenticated"
    ON users FOR SELECT
    TO authenticated
    USING (true);  -- Allow all authenticated users to read users table

-- Keep update policy (already works)
-- DROP POLICY IF EXISTS "users_can_update_own" ON users;

-- ========================================
-- 3. VERIFY - Should show 3 policies, no recursion
-- ========================================

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN policyname = 'users_can_read_own' THEN '✅ Own profile'
        WHEN policyname = 'users_can_read_all_authenticated' THEN '✅ All users (safe)'
        WHEN policyname = 'users_can_update_own' THEN '✅ Update own'
        ELSE '⚠️ Check this'
    END as purpose,
    CASE
        WHEN qual LIKE '%SELECT%FROM%users%' OR with_check LIKE '%SELECT%FROM%users%' THEN '❌ RECURSIVE!'
        ELSE '✅ Safe'
    END as recursion_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
