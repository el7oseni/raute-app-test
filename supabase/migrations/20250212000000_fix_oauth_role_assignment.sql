-- ==========================================
-- MIGRATION: Fix OAuth Role Assignment
-- Date: 2025-02-12
-- Purpose: Update trigger to properly handle OAuth user signups
-- ==========================================

-- Update the signup trigger function with OAuth-compatible logic
CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  target_role TEXT;
  new_company_id UUID;
  existing_driver_id UUID;
  driver_company UUID;
BEGIN
  -- Check if user already exists (prevent duplicate processing)
  IF EXISTS (SELECT 1 FROM public.users WHERE id = new.id) THEN
    RETURN new;
  END IF;

  -- Check if email matches a pre-added driver
  SELECT id, company_id INTO existing_driver_id, driver_company
  FROM public.drivers 
  WHERE email = new.email
  LIMIT 1;

  IF existing_driver_id IS NOT NULL THEN
    -- DRIVER: Link to existing driver profile
    INSERT INTO public.users (id, email, full_name, role, company_id)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      'driver',
      driver_company
    );
    
    -- Update driver table with auth id
    UPDATE public.drivers SET user_id = new.id WHERE id = existing_driver_id;
  ELSE
    -- MANAGER: Create new company and user
    INSERT INTO public.companies (name) 
    VALUES (COALESCE(new.raw_user_meta_data->>'company_name', 'My Company')) 
    RETURNING id INTO new_company_id;
    
    target_role := COALESCE(new.raw_user_meta_data->>'role', 'manager');
    
    INSERT INTO public.users (id, email, full_name, role, company_id)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      target_role,
      new_company_id
    );
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block auth
  RAISE WARNING 'User signup trigger failed for %: %', new.email, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is properly bound
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_signup();
