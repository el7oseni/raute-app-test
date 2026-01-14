-- ULTIMATE FIX - Clean Signup Trigger Without Debug Logs
-- Remove ALL debug logging and make it ONLY fire on INSERT (not UPDATE)

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate WITHOUT debug logs
CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  target_role TEXT;
BEGIN
  -- Only run for NEW signups (not updates)
  target_role := COALESCE(new.raw_user_meta_data->>'role', 'manager');
  
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    target_role
  )
  ON CONFLICT (id) DO NOTHING;  -- Don't update if exists

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Fail silently, don't block auth
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger but ONLY on INSERT (not UPDATE)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users  -- Only INSERT, not UPDATE
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_signup();
