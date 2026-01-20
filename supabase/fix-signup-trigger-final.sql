-- ============================================
-- FINAL SIGNUP FIX: Safe Trigger + Robust RPC
-- ============================================

-- 1. SAFE TRIGGER FUNCTION
-- Wraps logic in an exception block to prevent "Database error saving new user"
-- If the trigger fails, it fails silently so Auth can proceed, 
-- and the RPC will pick up the pieces.

CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  existing_driver_id UUID;
  driver_name TEXT;
  driver_company UUID;
  is_admin_created BOOLEAN;
BEGIN
  BEGIN
    -- 🔍 DETECTION: Check if this was created by Admin API
    is_admin_created := (new.raw_app_meta_data->>'created_by_admin')::boolean;

    -- 🚫 SKIP: If created by admin, the API Route will handle everything
    IF is_admin_created = true THEN
      RETURN new;
    END IF;

    -- ✅ HANDLE: This is a self-signup (organic registration)
    
    -- Check if this email matches a pre-added driver
    SELECT id, name, company_id INTO existing_driver_id, driver_name, driver_company
    FROM public.drivers 
    WHERE email = new.email
    LIMIT 1;

    IF existing_driver_id IS NOT NULL THEN
      -- 🔗 SCENARIO A: Driver Self Sign-up (Manager invited them earlier)
      INSERT INTO public.users (id, email, full_name, role, company_id)
      VALUES (new.id, new.email, driver_name, 'driver', driver_company)
      ON CONFLICT (id) DO NOTHING;

      -- Link the driver record
      UPDATE public.drivers 
      SET user_id = new.id 
      WHERE id = existing_driver_id;

    ELSE
      -- 🆕 SCENARIO B: New Manager/User Sign-up
      INSERT INTO public.users (id, email, full_name, role)
      VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        'manager'
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- 🛡️ SAFETY CHECK: If anything fails here, DO NOT BLOCK SIGNUP.
    -- Log it if you checked logs, otherwise just proceed.
    -- The RPC will ensure the profile is created.
    RETURN new;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RE-BIND TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_signup();


-- 3. ROBUST RPC: complete_manager_signup
-- Handles cases where the trigger already created the user OR failed to create it.
-- Ensures the User is linked to the new Company correctly.

CREATE OR REPLACE FUNCTION public.complete_manager_signup(
    user_email TEXT,
    company_name TEXT,
    full_name TEXT,
    user_password TEXT
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

    -- 1. Create Company (Always create a new company for a new manager signup)
    INSERT INTO public.companies (name, email)
    VALUES (company_name, user_email)
    RETURNING id INTO new_comp_id;

    -- 2. Create or Update User Profile
    -- If trigger created it, it has no company_id. We update it.
    -- If trigger failed, we create it.
    INSERT INTO public.users (id, email, full_name, role, company_id, status)
    VALUES (
        new_user_id,
        user_email,
        full_name,
        'manager',
        new_comp_id,
        'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        company_id = EXCLUDED.company_id, -- Link the company
        role = 'manager',                 -- Ensure role is manager
        full_name = EXCLUDED.full_name,
        status = 'active';

    RETURN json_build_object('success', true, 'user_id', new_user_id, 'company_id', new_comp_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_manager_signup TO anon, authenticated, service_role;
