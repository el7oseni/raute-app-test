-- FIND AUTH HOOK FUNCTIONS
-- We are looking for the function causing the 500 error during token generation.
-- It likely modifies the JWT (Custom Claims).

SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    l.lanname as language,
    pg_get_function_result(p.oid) as return_type,
    pg_get_userbyid(p.proowner) as owner,
    p.prosrc as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname IN ('public', 'auth', 'hidden')
  AND (
      p.proname ILIKE '%hook%'
      OR p.proname ILIKE '%claim%'
      OR p.proname ILIKE '%token%'
      OR p.proname ILIKE '%role%'
      OR pg_get_function_result(p.oid) = 'jsonb'
  )
  AND p.proname NOT LIKE 'pg_%' -- Exclude system functions
ORDER BY schema_name, function_name;

-- CHECK IF RLS IS BLOCKING AUTH ADMIN
SELECT 
    rolname, 
    rolbypassrls 
FROM pg_roles 
WHERE rolname = 'supabase_auth_admin';
