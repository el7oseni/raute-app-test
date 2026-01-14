-- CHECK RLS: List all policies on auth.users
-- Normally, there should be NO policies on auth.users, or very specific system ones.
-- If a user added a policy here blocking updates, login will fail with 500.

SELECT * FROM pg_policies WHERE schemaname = 'auth' AND tablename = 'users';

-- Also check if RLS is enabled on auth.users
SELECT relname, relrowsecurity 
FROM pg_class 
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
WHERE nspname = 'auth' AND relname = 'users';
