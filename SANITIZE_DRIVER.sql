-- SANITIZE DRIVER METADATA
-- The Manager has NULL metadata and works. The Driver has data and fails.
-- Let's make the Driver look EXACTLY like the Manager.

UPDATE auth.users
SET 
    -- 1. Clear User Metadata (Manager has NULL)
    raw_user_meta_data = NULL,
    
    -- 2. Standardize App Metadata
    raw_app_meta_data = '{"provider":"email"}'::jsonb
    
WHERE email = 'loloz@gmail.com';

-- Verification
SELECT email, raw_user_meta_data, raw_app_meta_data
FROM auth.users
WHERE email = 'loloz@gmail.com';
