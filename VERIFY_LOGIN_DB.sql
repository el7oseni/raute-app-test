-- DIAGNOSE & FIX: Password Check + Service Role Permissions

-- 1. Can we verify the password manually?
-- This checks if pgcrypto is working and the hash is valid.
-- Replace '12345678' with the password you are testing with.
SELECT 
    id, 
    email, 
    (encrypted_password = crypt('12345678', encrypted_password)) AS password_correct
FROM auth.users 
WHERE email = 'loloz@gmail.com';

-- 2. REPAIR: Ensure the Auth Service User (supabase_auth_admin) has access
-- This is the user that actually performs the login check on the server
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;

-- 3. REPAIR: Ensure authenticator has access to public schema
GRANT USAGE ON SCHEMA public TO authenticator;
ALTER ROLE authenticator SET search_path = public, extensions;

-- 4. Reload
NOTIFY pgrst, 'reload schema';
