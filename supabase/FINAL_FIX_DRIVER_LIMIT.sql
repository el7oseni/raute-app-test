-- ============================================
-- CORRECT FIX: Ensure Free Tier = 1 Driver Only
-- Run this in Supabase Production SQL Editor
-- ============================================

BEGIN;

-- Step 1: Update complete_manager_signup to set driver_limit = 1
CREATE OR REPLACE FUNCTION public.complete_manager_signup(
    user_email TEXT,
    company_name TEXT,
    full_name TEXT,
    user_password TEXT,
    user_phone TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_user_id UUID;
    new_comp_id UUID;
BEGIN
    -- Get the user ID from auth
    SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;
    
    IF new_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found in auth');
    END IF;

    -- 1. Create Company
    INSERT INTO public.companies (name, email)
    VALUES (company_name, user_email)
    RETURNING id INTO new_comp_id;

    -- 2. Create User Profile with driver_limit = 1 (FREE TIER)
    INSERT INTO public.users (id, email, full_name, role, company_id, phone, status, driver_limit)
    VALUES (
        new_user_id,
        user_email,
        full_name,
        'manager',
        new_comp_id,
        user_phone,
        'active',
        1  -- ✅ FREE TIER: Only 1 driver allowed
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        company_id = EXCLUDED.company_id,
        role = 'manager',
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.users.phone),
        status = 'active',
        driver_limit = COALESCE(public.users.driver_limit, 1);

    -- ✅ NO AUTOMATIC DRIVER CREATION
    -- Users must manually add drivers from the dashboard

    RETURN json_build_object('success', true, 'user_id', new_user_id, 'company_id', new_comp_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_manager_signup TO anon, authenticated, service_role;

-- Step 2: Ensure handle_new_user_signup doesn't create extra drivers
-- (This is the REAL trigger that might be causing issues)
CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  existing_driver_id UUID;
  driver_name TEXT;
  driver_company UUID;
  is_admin_created BOOLEAN;
BEGIN
  BEGIN
    -- Check if created by admin
    is_admin_created := (new.raw_app_meta_data->>'created_by_admin')::boolean;
    
    IF is_admin_created = true THEN
      RETURN new;  -- Skip, will be handled by admin API
    END IF;
    
    -- Check if this email matches a pre-added driver
    SELECT id, name, company_id INTO existing_driver_id, driver_name, driver_company
    FROM public.drivers 
    WHERE email = new.email
    LIMIT 1;

    IF existing_driver_id IS NOT NULL THEN
      -- Driver self-signup: Link to existing driver
      INSERT INTO public.users (id, email, full_name, role, company_id, phone, driver_limit)
      VALUES (
        new.id, 
        new.email, 
        driver_name, 
        'driver', 
        driver_company,
        new.raw_user_meta_data->>'phone',
        1  -- Even drivers get default limit of 1
      )
      ON CONFLICT (id) DO NOTHING;

      UPDATE public.drivers 
      SET user_id = new.id 
      WHERE id = existing_driver_id;
    ELSE
      -- New manager signup: Create user profile ONLY (no drivers!)
      INSERT INTO public.users (id, email, full_name, role, phone, driver_limit)
      VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        'manager',
        new.raw_user_meta_data->>'phone',
        1  -- ✅ FREE TIER DEFAULT
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Safety: Don't block signup if this fails
    RETURN new;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is bound
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_signup();

COMMIT;

-- Verification Query
SELECT 
    'Fix Applied! Check recent signups:' as status;

SELECT 
    c.name AS company,
    c.created_at,
    COUNT(d.id) AS drivers,
    u.driver_limit
FROM public.companies c
LEFT JOIN public.users u ON u.company_id = c.id AND u.role = 'manager'
LEFT JOIN public.drivers d ON d.company_id = c.id
WHERE c.created_at > NOW() - INTERVAL '1 day'
GROUP BY c.id, c.name, c.created_at, u.driver_limit
ORDER BY c.created_at DESC;
