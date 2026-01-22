-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop the old function to be safe
DROP FUNCTION IF EXISTS public.create_driver_account(text, text, text, uuid, text, text, text, numeric, numeric, jsonb);

-- 3. Create the ULTIMATE Driver Creation Function
CREATE OR REPLACE FUNCTION public.create_driver_account(
    email TEXT,
    password TEXT,
    full_name TEXT,
    company_id UUID,
    phone TEXT DEFAULT NULL,
    vehicle_type TEXT DEFAULT NULL,
    default_start_address TEXT DEFAULT NULL,
    default_start_lat NUMERIC DEFAULT NULL,
    default_start_lng NUMERIC DEFAULT NULL,
    custom_values JSONB DEFAULT '{}'::jsonb
) RETURNS JSON AS $$
DECLARE
    new_user_id UUID;
    new_driver_id UUID;
    check_user_id UUID;
BEGIN
    -- A. Check if user already exists in auth.users
    SELECT id INTO check_user_id FROM auth.users WHERE auth.users.email = create_driver_account.email;
    
    IF check_user_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'User with this email already exists');
    END IF;

    -- B. DIRECT INSERT into auth.users (Bypassing API limits)
    -- This requires the function to run as Superuser or Service Role (SECURITY DEFINER)
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
        '00000000-0000-0000-0000-000000000000', -- Default instance_id
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        email,
        crypt(password, gen_salt('bf')), -- Hash the password securely
        now(), -- Auto confirm email
        NULL,
        NULL,
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        json_build_object('full_name', full_name, 'role', 'driver', 'company_id', company_id)::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO new_user_id;

    -- C. Insert/Update public.users (Sync)
    INSERT INTO public.users (id, email, full_name, role, company_id, phone, status)
    VALUES (new_user_id, email, full_name, 'driver', company_id, phone, 'active')
    ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name, 
        role = EXCLUDED.role, 
        company_id = EXCLUDED.company_id, 
        phone = EXCLUDED.phone;

    -- D. Insert into public.drivers
    INSERT INTO public.drivers (
        user_id,
        company_id,
        name,
        vehicle_type,
        default_start_address,
        default_start_lat,
        default_start_lng,
        custom_data
    ) VALUES (
        new_user_id,
        company_id,
        full_name, -- Use user's full name
        vehicle_type,
        default_start_address,
        default_start_lat,
        default_start_lng,
        custom_values
    ) RETURNING id INTO new_driver_id;

    RETURN json_build_object('success', true, 'driver_id', new_driver_id, 'user_id', new_user_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;
