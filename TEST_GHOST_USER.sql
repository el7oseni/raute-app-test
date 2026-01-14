-- ISOLATE PUBLIC TABLE
-- We will create a user that exists ONLY in auth.users
-- This proves if 'public.users' is crashing the login.

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
    'ghost_driver@gmail.com',  -- GHOST USER
    crypt('12345678', gen_salt('bf')),
    now(),
    '{"provider":"email"}',
    NULL,
    now(),
    now(),
    false
);
-- Note: We are NOT inserting into public.users
