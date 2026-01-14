-- DEBUG UTILITIES & TRACE
-- 1. Check definition of the common utility function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'update_updated_at_column';

-- 2. Create a Debug Log table to see if Triggers are running
CREATE TABLE IF NOT EXISTS public.debug_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message text,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

-- 3. Allow everyone to write to it (for debugging)
GRANT ALL ON public.debug_logs TO public;
GRANT ALL ON public.debug_logs TO anon;
GRANT ALL ON public.debug_logs TO authenticated;
GRANT ALL ON public.debug_logs TO service_role;
GRANT ALL ON public.debug_logs TO supabase_auth_admin;

-- 4. Instrument user signup trigger with Logging
CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  target_role TEXT;
BEGIN
  INSERT INTO public.debug_logs (message, details) VALUES ('Trigger Started', to_jsonb(new));

  -- Login Logic
  target_role := COALESCE(new.raw_user_meta_data->>'role', 'manager');
  
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    target_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role;
    
  INSERT INTO public.debug_logs (message, details) VALUES ('User Created', jsonb_build_object('id', new.id, 'role', target_role));

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.debug_logs (message, details) VALUES ('Trigger Failed', jsonb_build_object('error', SQLERRM));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
