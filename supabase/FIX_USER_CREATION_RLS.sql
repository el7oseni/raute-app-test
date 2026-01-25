-- FIX USER CREATION RLS
-- The current RLS policies prevent new users from inserting their own profile row during signup/login.
-- This causes the "Login Loop" because auth/callback fails to create the profile, and middleware logs out users without a profile.

-- 1. Enable RLS (just in case)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to INSERT their own profile
-- This is critical for the generic OAuth callback to work
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Allow users to UPDATE their own profile
-- Needed for the onboarding flow to set company_id and phone
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- 4. Allow users to SELECT their own profile (regardless of company)
-- The existing "view users in their company" policy might fail if company_id is null!
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);
