-- Function to update a driver's full profile including sensitive auth data
-- Usage: supabase.rpc('update_driver_full', { target_driver_id: '...', ... })

create or replace function update_driver_full(
    target_driver_id uuid,
    new_name text,
    new_phone text,
    new_vehicle_type text,
    new_status text,
    new_custom_values jsonb,
    new_email text default null,
    new_password text default null
)
returns jsonb language plpgsql security definer as $$
declare
    target_user_id uuid;
    current_email text;
    encrypted_pw text;
begin
    -- 1. Get the associated user_id from the drivers table
    select user_id into target_user_id from public.drivers where id = target_driver_id;

    if target_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Driver is not linked to a user account');
    end if;

    -- 2. Update public.drivers (The easy part)
    update public.drivers
    set 
        name = new_name,
        phone = new_phone,
        vehicle_type = new_vehicle_type,
        status = new_status,
        custom_values = new_custom_values,
        updated_at = now()
    where id = target_driver_id;

    -- 3. Update Email (if changed)
    if new_email is not null and new_email <> '' then
        -- Check if email exists for ANOTHER user
        if exists (select 1 from auth.users where email = new_email and id <> target_user_id) then
            return jsonb_build_object('success', false, 'error', 'Email already in use by another user');
        end if;

        -- Update auth.users
        update auth.users 
        set email = new_email, updated_at = now() 
        where id = target_user_id;

        -- Update public.users
        update public.users 
        set email = new_email, updated_at = now() 
        where id = target_user_id;
    end if;

    -- 4. Update Password (if provided)
    if new_password is not null and new_password <> '' and length(new_password) >= 6 then
        encrypted_pw := crypt(new_password, gen_salt('bf'));
        
        update auth.users
        set encrypted_password = encrypted_pw, updated_at = now()
        where id = target_user_id;
    end if;

    return jsonb_build_object('success', true);
exception when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
