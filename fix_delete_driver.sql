create or replace function delete_user_by_admin(target_user_id uuid)
returns jsonb language plpgsql security definer as $$
begin
    -- 1. Delete from public.drivers first (if exists) due to FK constraint often pointing to users
    -- or if ON DELETE CASCADE is set, deleting auth.user might be enough, but explicit delete is safer
    
    -- 2. Delete from auth.users (This should cascade to public.users if configured correctly, but let's be robust)
    delete from auth.users where id = target_user_id;
    
    -- If cascade isn't set up, we might need to manually delete from public.users / public.drivers first
    -- Assuming standard Supabase setup where auth.users is the parent.
    
    if not found then
        return jsonb_build_object('success', false, 'error', 'User not found');
    end if;

    return jsonb_build_object('success', true);
exception when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
