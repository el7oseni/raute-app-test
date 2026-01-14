-- SIMULATE LOGIN (VISIBLE RESULT)
-- This function will return a row with the result, so you can see it in the grid.

CREATE OR REPLACE FUNCTION test_login_update() 
RETURNS table(status text, message text) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    target_id uuid;
BEGIN
    SELECT id INTO target_id FROM auth.users WHERE email = 'test_clean@gmail.com';

    IF target_id IS NULL THEN
        RETURN QUERY SELECT 'ERROR', 'Test user not found';
        RETURN;
    END IF;

    -- Simulate the update
    UPDATE auth.users 
    SET last_sign_in_at = now() 
    WHERE id = target_id;

    RETURN QUERY SELECT 'SUCCESS', 'Update successful without errors';
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'CRITICAL_ERROR', SQLERRM;
END;
$$;

-- Run the function
SELECT * FROM test_login_update();
