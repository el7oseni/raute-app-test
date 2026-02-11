-- ==========================================
-- CHECK: Does auth.uid() match public.users.id?
-- This determines if RLS policies will work
-- ==========================================

-- 1. Show auth user IDs vs public user IDs for heshamelhoseni25
SELECT 
  'AUTH vs PUBLIC' as check_type,
  au.id as auth_id,
  u.id as public_id,
  au.email,
  u.role,
  u.company_id,
  CASE 
    WHEN au.id = u.id THEN 'MATCH - RLS WILL WORK'
    ELSE 'MISMATCH - RLS WILL BLOCK!'
  END as id_status
FROM auth.users au
LEFT JOIN public.users u ON u.email = au.email
WHERE au.email = 'heshamelhoseni25@gmail.com';

-- 2. Check ALL users for ID mismatches
SELECT 
  'ID MISMATCH CHECK' as check_type,
  au.email,
  au.id as auth_id,
  u.id as public_id,
  u.role,
  CASE WHEN au.id = u.id THEN 'OK' ELSE 'MISMATCH!' END as status
FROM auth.users au
LEFT JOIN public.users u ON u.email = au.email
WHERE au.email_confirmed_at IS NOT NULL
ORDER BY 
  CASE WHEN au.id != u.id OR u.id IS NULL THEN 0 ELSE 1 END,
  au.created_at DESC;

-- 3. Check all RLS policies on users table
SELECT 
  policyname,
  permissive,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- 4. Check if RLS is enabled on users table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users'
AND schemaname = 'public';
