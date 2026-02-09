-- 1. Enable pgcrypto just in case
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the ULTIMATE Dispatcher Creation Function
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
    -- A. Check if user already exists
    SELECT id INTO check_user_id FROM auth.users WHERE auth.users.email = create_dispatcher_account.email;
    
    IF check_user_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'User with this email already exists');
    END IF;

    -- B. DIRECT INSERT into auth.users (Magic Step)
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
        crypt(password, gen_salt('bf'::text)), -- Secure Hash
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

    -- C. Insert into public.users
    INSERT INTO public.users (id, email, full_name, role, company_id, permissions, status)
    VALUES (new_user_id, email, full_name, 'dispatcher', company_id, permissions, 'active');

    RETURN json_build_object('success', true, 'user_id', new_user_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
