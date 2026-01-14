-- TEST AUTH ADMIN PERMISSIONS (DIRECT)
-- Using a DO block avoids the function restriction on RESET ROLE

DO $$
DECLARE
    target_id uuid;
BEGIN
    RAISE NOTICE '--- START TEST ---';

    -- 1. Switch to Auth Admin
    SET ROLE supabase_auth_admin;

    -- 2. Find User
    SELECT id INTO target_id FROM auth.users WHERE email = 'test_clean@gmail.com';
    
    IF target_id IS NULL THEN
        RAISE NOTICE 'ERROR: User not found';
    ELSE
        -- 3. Try Update
        UPDATE auth.users 
        SET last_sign_in_at = now() 
        WHERE id = target_id;
        
        RAISE NOTICE 'SUCCESS: Auth Admin updated user successfully';
    END IF;

    -- 4. Reset Role (this works inside DO block)
    RESET ROLE;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAILURE: %', SQLERRM;
    RESET ROLE;
END $$;
