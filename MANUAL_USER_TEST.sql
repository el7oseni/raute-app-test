-- MANUAL TEST USER
-- We will create a user "from scratch" directly in the database.
-- If this user works, then the App's creation logic is broken.
-- If this user FAILS, then the Database/Auth Config is broken.

-- 1. Create the user in auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test_clean@gmail.com', -- The Test Email
    crypt('12345678', gen_salt('bf')), -- Password: 12345678
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Clean Test User"}',
    now(),
    now(),
    false
) RETURNING id;

-- (Copy the ID returned above if you need to debug later, but login should just work)
