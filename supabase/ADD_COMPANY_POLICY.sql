-- Add the missing policy that allows reading company data
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

-- Verify - should show 3 policies now
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN policyname = 'users_can_read_own' THEN '✅ Own profile'
        WHEN policyname = 'users_can_read_company' THEN '✅ Company members'
        WHEN policyname = 'users_can_update_own' THEN '✅ Update own'
        ELSE '⚠️ Unexpected'
    END as status
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
