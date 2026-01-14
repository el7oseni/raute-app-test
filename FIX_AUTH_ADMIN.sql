-- FIX AUTH ADMIN PERMISSIONS (MISSING LINK)
-- We previously fixed 'authenticator' but missed 'supabase_auth_admin'
-- This role is what the Auth Server actually uses!

-- 1. Grant Usage on Extensions (Critical for gen_random_uuid)
GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin;

-- 2. Grant Execute on all functions in extensions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO supabase_auth_admin;

-- 3. Fix the Search Path for this specific role
-- This ensures it finds 'gen_random_uuid()' without needing 'extensions.' prefix
ALTER ROLE supabase_auth_admin SET search_path = public, extensions, auth;

-- 4. Grant access to public schema (just in case triggers use it)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;

-- 5. Force Schema Reload
NOTIFY pgrst, 'reload schema';
