-- COMPLETE SETUP FOR NEW PROJECT
-- Run this AFTER schema.sql

-- 1. RLS Policies (Safe, non-recursive)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    TO authenticated, anon
    USING (id = auth.uid());

DROP POLICY IF EXISTS "users_service_all" ON public.users;
CREATE POLICY "users_service_all" ON public.users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

-- 2. Signup Trigger (Clean)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  target_role TEXT;
BEGIN
  target_role := COALESCE(new.raw_user_meta_data->>'role', 'manager');
  
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    target_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_signup();

-- 3. Fix Driver Limit Trigger (with SECURITY DEFINER)
DROP TRIGGER IF EXISTS enforce_driver_limit ON public.drivers;

CREATE OR REPLACE FUNCTION public.check_driver_limit()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  driver_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO driver_count
  FROM public.drivers
  WHERE company_id = NEW.company_id AND status = 'active';
  
  IF driver_count >= 30 THEN
    RAISE EXCEPTION 'Driver limit reached. Maximum 30 active drivers allowed per company.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_driver_limit
  BEFORE INSERT ON public.drivers
  FOR EACH ROW EXECUTE PROCEDURE public.check_driver_limit();

-- Done!
SELECT 'Setup complete! Try signup now.' as status;
