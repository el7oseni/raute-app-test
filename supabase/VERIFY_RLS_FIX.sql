-- VERIFY RLS FIX
-- Run this AFTER running FIX_RLS_RECURSION.sql

-- 1. Switch to a simulated user (using the ID from your screenshot or a known user)
-- Replace 'USER_UUID_HERE' with the actual ID of 'loloz@gmail.com' or the new signup.
-- You can find the ID by running: SELECT id FROM auth.users WHERE email = 'loloz@gmail.com';

DO $$
DECLARE
    target_user_id uuid;
    user_record record;
BEGIN
    -- Get the ID for test user
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'loloz@gmail.com';
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Test user not found!';
        RETURN;
    END IF;

    -- Simulate checking as that user (In SQL Editor this doesn't fully simulate RLS unless you use set_config)
    -- But we can simulate the logic:
    
    RAISE NOTICE 'Testing RLS logic for user %...', target_user_id;
    
    -- Check if the "Golden Rule" works (Direct ID match)
    PERFORM * FROM public.users 
    WHERE id = target_user_id
    AND id = target_user_id; -- Matches "auth.uid() = id" logic
    
    IF FOUND THEN
        RAISE NOTICE '✅ SUCCESS: User can see themselves via ID match.';
    ELSE
        RAISE NOTICE '❌ FAIL: User cannot see themselves.';
    END IF;

END $$;

-- 2. Real Query Check (Run this part manually in SQL Editor)
SELECT * FROM public.users WHERE email = 'loloz@gmail.com';
