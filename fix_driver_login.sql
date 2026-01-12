-- 1. Fix the create_driver_account RPC to use 'authenticated' role
create or replace function create_driver_account(
    email text,
    password text,
    full_name text,
    phone text,
    vehicle_type text,
    company_id uuid,
    custom_values jsonb default '{}'::jsonb,
    default_start_address text default null,
    default_start_lat float8 default null,
    default_start_lng float8 default null
) returns jsonb language plpgsql security definer as $$
declare
    new_user_id uuid;
    encrypted_pw text;
begin
    -- Check if email exists
    if exists (select 1 from auth.users where auth.users.email = create_driver_account.email) then
        return jsonb_build_object('success', false, 'error', 'Email already exists');
    end if;

    new_user_id := gen_random_uuid();
    encrypted_pw := crypt(password, gen_salt('bf'));
    
    -- Insert into auth.users (Role MUST be 'authenticated' to work with Supabase Auth correctly)
    insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at
    )
    values (
        '00000000-0000-0000-0000-000000000000', 
        new_user_id, 
        'authenticated', 
        'authenticated', -- FIX: Was likely 'driver' causing the schema error
        email, 
        encrypted_pw, 
        now(), 
        '{"provider":"email","providers":["email"]}', 
        jsonb_build_object('full_name', full_name, 'role', 'driver'), 
        now(), 
        now()
    );
    
    -- Insert into public.users (This is where the App looks for roles)
    insert into public.users (id, company_id, email, full_name, role, status, created_at, updated_at)
    values (new_user_id, company_id, email, full_name, 'driver', 'active', now(), now());
    
    -- Insert into public.drivers
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

-- 2. Fix the problematic user (test1@gmail.com) if they exist
do $$
begin
    if exists (select 1 from auth.users where email = 'test1@gmail.com') then
        update auth.users set role = 'authenticated' where email = 'test1@gmail.com';
    end if;
end $$;
