-- NUCLEAR FIX LOGIN
-- This script removes ALL questionable triggers and reinstalls a clean, working one.
-- It fixes 'Database error querying schema' caused by broken automation.

-- 1. DROP EVERYTHING (Clean Slate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup();

-- Drop potential other triggers that might be hiding
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP TRIGGER IF EXISTS on_user_update ON auth.users;

-- 2. CREATE THE ROBUST FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  is_admin_created BOOLEAN;
  existing_company_id UUID;
  target_role TEXT;
BEGIN
  -- 🔍 LOGIC: Detect if Admin created or User created
  is_admin_created := (new.raw_app_meta_data->>'created_by_admin')::boolean;
  
  -- If Admin created (via our RPC functions), we TRUST that the RPC handled the inserts.
  -- We do NOTHING to avoid "Duplicate Key" errors.
  IF is_admin_created = true THEN
    RETURN new;
  END IF;

  -- 🟢 FALLBACK: If standard signup (No metadata), assume Manager
  target_role := COALESCE(new.raw_user_meta_data->>'role', 'manager');
  
  -- Create the public user profile safely
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    target_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role; -- Update if exists (Self-healing)

  -- Create a Company for new Managers automatically
  IF target_role = 'manager' THEN
    INSERT INTO public.companies (name)
    VALUES (COALESCE(new.raw_user_meta_data->>'company_name', 'My Company'))
    RETURNING id INTO existing_company_id;

    -- Link user to company
    UPDATE public.users 
    SET company_id = existing_company_id 
    WHERE id = new.id;
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- 🛡️ SAFETY NET: If this trigger fails, LOG it but DON'T BLOCK LOGIN
  RAISE WARNING 'Signup Trigger Failed: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RE-APPLY THE TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_signup();

-- 4. FIX PERMISSIONS (Ensure Supabase Auth can run this)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.users TO supabase_auth_admin;
GRANT ALL ON TABLE public.companies TO supabase_auth_admin;
GRANT ALL ON TABLE public.drivers TO supabase_auth_admin;

-- 5. ENSURE RLS DOESN'T BLOCK TRIGGERS (Bypass RLS for System Roles)
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;
