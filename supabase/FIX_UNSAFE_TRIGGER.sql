-- FIX UNSAFE TRIGGER
-- The 'check_driver_limit' function was crashing because it didn't have permission 
-- to count drivers when a new user was signing up.

-- 1. Drop the old function (optional, but good for clean replace)
DROP TRIGGER IF EXISTS enforce_driver_limit ON public.drivers;

-- 2. Re-create the function with SECURITY DEFINER (Admin Privileges)
CREATE OR REPLACE FUNCTION public.check_driver_limit()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER -- <--- THIS IS THE FIX (Runs as Admin)
AS $$
DECLARE
  driver_count INTEGER;
BEGIN
  -- Count active drivers (Now safe because we are Admin)
  SELECT COUNT(*) INTO driver_count
  FROM public.drivers
  WHERE company_id = NEW.company_id AND status = 'active';
  
  -- Check limit
  IF driver_count >= 30 THEN
    RAISE EXCEPTION 'Driver limit reached. Maximum 30 active drivers allowed per company.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Re-enable the trigger
CREATE TRIGGER enforce_driver_limit
  BEFORE INSERT ON public.drivers
  FOR EACH ROW EXECUTE PROCEDURE public.check_driver_limit();
