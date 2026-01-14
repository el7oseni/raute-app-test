-- CRITICAL FIX: Repair System Roles (Authenticator & Authenticated)
-- Use this to fix "Database error querying schema" and 500 Internal Server Error on login.

-- 1. Grant Schema Usage to the API Role (authenticator)
-- This is the role that "knocks on the door" before logging in.
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT USAGE ON SCHEMA auth TO authenticator;

-- 2. Grant Schema Usage to the User Role (authenticated)
-- This is the role the user assumes after logging in.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- 3. Fix Search Paths
-- Ensures the database knows where to look for tables.
ALTER ROLE authenticator SET search_path = public, extensions;
ALTER ROLE authenticated SET search_path = public, extensions;

-- 4. Reload API Cache
NOTIFY pgrst, 'reload schema';
