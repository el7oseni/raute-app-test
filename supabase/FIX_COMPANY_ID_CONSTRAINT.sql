-- FIX USER CREATION BUG
-- The "users" table currently requires "company_id" to be set immediately.
-- But new users signing up nicely with Google/Apple don't have a company yet (we ask for it in Onboarding).
-- This causes the "Signup Loop" because the profile creation fails silently due to the missing company_id.

-- 1. Make company_id Optional
ALTER TABLE users ALTER COLUMN company_id DROP NOT NULL;

-- 2. Make drivers company_id Optional (Just in case, though drivers usually have it)
ALTER TABLE drivers ALTER COLUMN company_id DROP NOT NULL;

-- 3. Safety Check: Verify the column is nullable
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'company_id';
