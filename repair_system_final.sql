-- FIXED: Robust Delete Function that handles 'Ghost' users
create or replace function delete_user_by_admin(target_user_id uuid)
returns jsonb language plpgsql security definer as $$
begin
    -- 1. Force delete from public.drivers logic (ignoring if not found)
    delete from public.drivers where user_id = target_user_id;
    
    -- 2. Force delete from public.users
    delete from public.users where id = target_user_id;
    
    -- 3. Force delete from auth.users
    delete from auth.users where id = target_user_id;

    -- Always return success to allow the UI to refresh and remove the item
    return jsonb_build_object('success', true);
exception when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

-- FIXED: Driver Creation Function (re-apply to be safe)
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
