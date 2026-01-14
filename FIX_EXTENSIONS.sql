-- FIX EXTENSIONS & API CACHE
-- The generic 'Database error' often means the API can't access a helper function (like pgcrypto)

-- 1. Ensure 'extensions' schema is accessible
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role, authenticator;

-- 2. Grant Execute on ALL functions in generated schemas
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role, authenticator;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO postgres, authenticated, service_role, supabase_auth_admin;

-- 3. Fix Search Path for the API Role
-- Ensure it can find pgcrypto functions without specifying the schema
ALTER ROLE authenticator SET search_path = public, extensions, auth;
ALTER ROLE authenticated SET search_path = public, extensions, auth;

-- 4. Magic Fix: Re-grant Table Permissions explicitly
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 5. Force Heavy Cache Reload
NOTIFY pgrst, 'reload schema';

-- Verification: Can we call a crypto function as 'anon'?
SET ROLE anon;
SELECT gen_random_uuid(); -- Should work
RESET ROLE;
