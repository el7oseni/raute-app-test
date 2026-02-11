-- ==========================================
-- COMPLETE FIX: Apply All Changes at Once
-- Run this ONCE in Supabase SQL Editor
-- ==========================================

-- ============================================
-- PART 1: Trigger is already updated (confirmed by diagnostic)
-- ============================================

-- ============================================
-- PART 2: Fix Existing Broken Users
-- ============================================
DO $$
DECLARE
  auth_user RECORD;
  new_company_id UUID;
  fixed_count INTEGER := 0;
BEGIN
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    WHERE au.id NOT IN (SELECT id FROM public.users)
    AND au.email_confirmed_at IS NOT NULL
  LOOP
    INSERT INTO public.companies (name) 
    VALUES (COALESCE(auth_user.raw_user_meta_data->>'company_name', 'My Company'))
    RETURNING id INTO new_company_id;
    
    INSERT INTO public.users (id, email, full_name, role, company_id)
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1)),
      'manager',
      new_company_id
    );
    
    fixed_count := fixed_count + 1;
    RAISE NOTICE 'Fixed user: % (company: %)', auth_user.email, new_company_id;
  END LOOP;
  
  IF fixed_count = 0 THEN
    RAISE NOTICE 'No broken users found (all users already have records)';
  ELSE
    RAISE NOTICE 'Total users fixed: %', fixed_count;
  END IF;
END $$;

-- ============================================
-- PART 3: Verify RLS Policies Exist
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'users_can_read_own'
  ) THEN
    CREATE POLICY "users_can_read_own"
    ON users FOR SELECT TO authenticated
    USING (id = auth.uid());
    RAISE NOTICE 'Created users_can_read_own policy';
  ELSE
    RAISE NOTICE 'users_can_read_own policy already exists';
  END IF;
END $$;

-- ============================================
-- PART 4: Final Verification
-- ============================================
SELECT 
  u.email,
  u.role,
  u.company_id,
  c.name as company_name,
  CASE 
    WHEN u.role IS NULL THEN 'NO ROLE'
    WHEN u.company_id IS NULL THEN 'NO COMPANY'
    ELSE 'VALID'
  END as status_check
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.companies c ON u.company_id = c.id
WHERE au.email_confirmed_at IS NOT NULL
ORDER BY au.created_at DESC
LIMIT 10;
