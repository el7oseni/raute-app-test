-- ==========================================
-- CLEANUP: Fix Existing OAuth Users Without Roles
-- Purpose: One-time script to repair users who signed up via OAuth
--          before the trigger was fixed
-- ==========================================

-- Find and fix all auth users who don't have a public.users record
DO $$
DECLARE
  auth_user RECORD;
  new_company_id UUID;
  fixed_count INTEGER := 0;
BEGIN
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.users)
  LOOP
    -- Create company for this user
    INSERT INTO public.companies (name) 
    VALUES (COALESCE(auth_user.raw_user_meta_data->>'company_name', 'My Company'))
    RETURNING id INTO new_company_id;
    
    -- Create user record with manager role
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
  
  RAISE NOTICE 'Total users fixed: %', fixed_count;
END $$;

-- Verify the fix
SELECT 
  u.email,
  u.role,
  u.company_id,
  c.name AS company_name
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.companies c ON u.company_id = c.id
WHERE au.email_confirmed_at IS NOT NULL
ORDER BY au.created_at DESC
LIMIT 20;
