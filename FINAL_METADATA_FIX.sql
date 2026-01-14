-- FINAL FIX: Clean the metadata to match working accounts
-- This removes the "role" from metadata that's breaking login

UPDATE auth.users
SET 
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = jsonb_build_object('full_name', 
        COALESCE((raw_user_meta_data->>'full_name'), (SELECT full_name FROM public.users WHERE public.users.id = auth.users.id))
    )
WHERE id IN (
    SELECT id FROM public.users WHERE role IN ('driver', 'dispatcher')
);

-- Verify the fix
SELECT email, role, raw_app_meta_data, raw_user_meta_data
FROM auth.users
WHERE email = 'loloz@gmail.com';
