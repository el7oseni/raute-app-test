-- 1. Enable pgcrypto (required for gen_salt/crypt)
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- 2. Create the Dispatcher Creation Function
CREATE OR REPLACE FUNCTION public.create_dispatcher_account(
    email TEXT,
    password TEXT,
    full_name TEXT,
    company_id UUID,
    permissions JSONB DEFAULT '{}'::jsonb
) RETURNS JSON AS $$
DECLARE
    new_user_id UUID;
    check_user_id UUID;
BEGIN
    -- A. Check if user already exists in auth.users
    SELECT id INTO check_user_id FROM auth.users WHERE auth.users.email = create_dispatcher_account.email;

    IF check_user_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'User with this email already exists');
    END IF;

    -- B. Also check public.users to be safe
    SELECT id INTO check_user_id FROM public.users WHERE public.users.email = create_dispatcher_account.email;

    IF check_user_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'User with this email already exists');
    END IF;

    -- C. DIRECT INSERT into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        email,
        extensions.crypt(password, extensions.gen_salt('bf'::text)),
        now(),
        NULL,
        NULL,
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        json_build_object('full_name', full_name, 'role', 'dispatcher', 'company_id', company_id)::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO new_user_id;

    -- D. Insert into public.users (use ON CONFLICT to handle the auto-trigger)
    INSERT INTO public.users (id, email, full_name, role, company_id, permissions, status)
    VALUES (new_user_id, email, full_name, 'dispatcher', company_id, permissions, 'active')
    ON CONFLICT (id) DO UPDATE SET
        role = 'dispatcher',
        full_name = EXCLUDED.full_name,
        company_id = EXCLUDED.company_id,
        permissions = EXCLUDED.permissions,
        status = 'active';

    RETURN json_build_object('success', true, 'user_id', new_user_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
