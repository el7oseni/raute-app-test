-- PERMANENT FIX: Update User Creation Logic (RPCs)
-- This ensures NEW users are created with the correct 'authenticated' role.

-- 1. Fixed Driver Creation Function
create or replace function create_driver_account(
    email text, password text, full_name text, phone text, vehicle_type text, company_id uuid,
    custom_values jsonb default '{}'::jsonb,
    default_start_address text default null,
    default_start_lat float8 default null, default_start_lng float8 default null
) returns jsonb language plpgsql security definer as $$
declare
    new_user_id uuid;
    encrypted_pw text;
begin
    if exists (select 1 from auth.users where auth.users.email = create_driver_account.email) then
        return jsonb_build_object('success', false, 'error', 'Email already exists');
    end if;
    new_user_id := gen_random_uuid();
    encrypted_pw := crypt(password, gen_salt('bf'));
    
    insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at
    )
    values (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', 
        email, encrypted_pw, now(), 
        '{"provider":"email","providers":["email"]}', 
        jsonb_build_object('full_name', full_name, 'role', 'driver'), 
        now(), now()
    );
    
    insert into public.users (id, company_id, email, full_name, role, status, created_at, updated_at)
    values (new_user_id, company_id, email, full_name, 'driver', 'active', now(), now());
    
    insert into public.drivers (
        company_id, user_id, name, phone, vehicle_type, status, 
        custom_values, default_start_address, default_start_lat, default_start_lng
    )
    values (
        company_id, new_user_id, full_name, phone, vehicle_type, 'active', 
        custom_values, default_start_address, default_start_lat, default_start_lng
    );
    
    return jsonb_build_object('success', true, 'id', new_user_id);
exception when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

-- 2. Fixed Dispatcher Creation Function
create or replace function create_dispatcher_account(
    email text,
    password text,
    full_name text,
    company_id uuid,
    permissions jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer as $$
declare
    new_user_id uuid;
    encrypted_pw text;
begin
    if exists (select 1 from auth.users where auth.users.email = create_dispatcher_account.email) then
        return jsonb_build_object('success', false, 'error', 'Email already exists');
    end if;

    new_user_id := gen_random_uuid();
    encrypted_pw := crypt(password, gen_salt('bf'));
    
    -- IMPORTANT: role must be 'authenticated'
    insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at
    )
    values (
        '00000000-0000-0000-0000-000000000000', 
        new_user_id, 
        'authenticated', 
        'authenticated', 
        email, 
        encrypted_pw, 
        now(), 
        '{"provider":"email","providers":["email"]}', 
        jsonb_build_object('full_name', full_name, 'role', 'dispatcher'), 
        now(), 
        now()
    );
    
    insert into public.users (id, company_id, email, full_name, role, status, permissions, created_at, updated_at)
    values (new_user_id, company_id, email, full_name, 'dispatcher', 'active', permissions, now(), now());
    
    return jsonb_build_object('success', true, 'id', new_user_id);
exception when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;  
