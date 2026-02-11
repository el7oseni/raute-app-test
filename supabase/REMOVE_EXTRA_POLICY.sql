-- Remove the extra INSERT policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Verify - should show only 2 policies now
SELECT 
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
