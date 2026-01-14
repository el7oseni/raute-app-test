-- FIX: Database Permissions & Role Consistency
-- "Database error querying schema" often means the database user can't "see" the schema.

-- 1. Grant Usage verify
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- 2. Ensure the specific user is definitely 'authenticated'
UPDATE auth.users 
SET role = 'authenticated' 
WHERE email = 'dsasa@gmail.com';

-- 3. Reset the 'raw_app_meta_data' to remove any ghost roles
-- Sometimes the JWT carries a 'role' inside the metadata that overrides the columns.
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'role'
WHERE email = 'dsasa@gmail.com';

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
