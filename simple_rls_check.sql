-- Simple RLS Check on public.users

-- 1. Is RLS enabled?
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- 2. What policies exist?
SELECT 
    policyname,
    roles,
    cmd,
    qual::text as using_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';
