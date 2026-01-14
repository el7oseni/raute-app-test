-- ========================================
-- ULTIMATE FIX: Repair All Driver/Dispatcher Accounts
-- ========================================
-- Run this ONCE to fix all existing broken accounts

-- STEP 1: Fix ALL existing Drivers and Dispatchers
UPDATE auth.users
SET 
    role = 'authenticated',
    aud = 'authenticated',
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    confirmation_token = NULL,
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE id IN (
    SELECT id FROM public.users WHERE role IN ('driver', 'dispatcher')
);

-- STEP 2: Remove any dangerous RLS policies on auth.users (if any exist)
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'auth' 
        AND tablename = 'users'
        AND policyname NOT LIKE 'Allow%'  -- Keep Supabase default policies
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON auth.users', policy_rec.policyname);
    END LOOP;
END $$;

-- STEP 3: Ensure correct permissions
GRANT USAGE ON SCHEMA auth TO authenticated, authenticator;
GRANT SELECT, UPDATE ON auth.users TO authenticated;

-- STEP 4: Reload Schema Cache
NOTIFY pgrst, 'reload schema';

-- STEP 5: Verification Query (Check one driver to confirm fix)
SELECT email, role, aud, email_confirmed_at 
FROM auth.users 
WHERE email = 'loloz@gmail.com';
