-- CHECK AUTH ADMIN PERMISSIONS (VISIBLE)
-- We need to see strict SUCCESS or FAILURE for the role that runs the Auth Server.

CREATE OR REPLACE FUNCTION test_auth_admin_update() 
RETURNS table(role_tested text, status text, message text) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    target_id uuid;
BEGIN
    -- Switch to the Auth Server's Role
    SET ROLE supabase_auth_admin;

    SELECT id INTO target_id FROM auth.users WHERE email = 'test_clean@gmail.com';
    
    IF target_id IS NULL THEN
        RESET ROLE; 
        RETURN QUERY SELECT 'supabase_auth_admin', 'ERROR', 'Test user not found';
        RETURN;
    END IF;

    -- Try the Update
    UPDATE auth.users 
    SET last_sign_in_at = now() 
    WHERE id = target_id;

    RESET ROLE;
    RETURN QUERY SELECT 'supabase_auth_admin', 'SUCCESS', 'Update worked flawlessly';

EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN QUERY SELECT 'supabase_auth_admin', 'FAILURE', SQLERRM;
END;
$$;

-- Run it
SELECT * FROM test_auth_admin_update();
