-- SIMULATE LOGIN UPDATE
-- The Auth server tries to run this update during login.
-- If this query fails here, it proves there is a BROKEN TRIGGER on auth.users.

DO $$
DECLARE
    target_id uuid;
BEGIN
    -- 1. Get the ID of our test user
    SELECT id INTO target_id FROM auth.users WHERE email = 'test_clean@gmail.com';

    RAISE NOTICE 'Testing Update on User ID: %', target_id;

    -- 2. Simulate the Login Update
    -- This is exactly what crashes the server 500
    UPDATE auth.users 
    SET last_sign_in_at = now() 
    WHERE id = target_id;

    RAISE NOTICE 'Update Successful! No broken triggers found.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'CRITICAL ERROR: %', SQLERRM;
END $$;
