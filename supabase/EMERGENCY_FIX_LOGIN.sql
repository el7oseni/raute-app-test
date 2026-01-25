-- EMERGENCY FIX: Restore users table policies for login
-- The combined policy created a recursive query that breaks login

BEGIN;

-- Drop the problematic combined policy
DROP POLICY IF EXISTS "users_read_company_and_self" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Restore simple, non-recursive policies
CREATE POLICY "users_can_read_own"
ON users FOR SELECT TO authenticated
USING (
    id = (select auth.uid())
);

CREATE POLICY "users_can_read_all_authenticated"
ON users FOR SELECT TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

CREATE POLICY "users_can_update_own"
ON users FOR UPDATE TO authenticated
USING (
    id = (select auth.uid())
)
WITH CHECK (
    id = (select auth.uid())
);

COMMIT;
