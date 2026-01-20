-- ============================================
-- URGENT FIX: Stop Auto-Creating 5 Drivers
-- Run this IMMEDIATELY in Supabase Production
-- ============================================

BEGIN;

-- 1. Drop ANY trigger on companies that creates drivers
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            tgname,
            pg_get_triggerdef(oid) as def
        FROM pg_trigger 
        WHERE tgrelid = 'public.companies'::regclass
    LOOP
        -- Check if trigger definition mentions 'drivers' table
        IF r.def ILIKE '%drivers%' OR r.tgname ILIKE '%driver%' THEN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.companies CASCADE', r.tgname);
            RAISE NOTICE 'DROPPED SUSPICIOUS TRIGGER: % (was creating drivers)', r.tgname;
        END IF;
    END LOOP;
END $$;

-- 2. Ensure complete_manager_signup does NOT create drivers
-- (Re-deploy the correct version)
DROP FUNCTION IF EXISTS public.complete_manager_signup(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.complete_manager_signup(text, text, text, text);

CREATE OR REPLACE FUNCTION public.complete_manager_signup(
    user_email TEXT,
    company_name TEXT,
    full_name TEXT,
    user_password TEXT,
    user_phone TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_user_id UUID;
    new_comp_id UUID;
BEGIN
    -- Get the user ID from auth
    SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;
    
    IF new_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found in auth');
    END IF;

    -- 1. Create Company (Always create a new company for a new manager signup)
    INSERT INTO public.companies (name, email)
    VALUES (company_name, user_email)
    RETURNING id INTO new_comp_id;

    -- 2. Create or Update User Profile
    INSERT INTO public.users (id, email, full_name, role, company_id, phone, status, driver_limit)
    VALUES (
        new_user_id,
        user_email,
        full_name,
        'manager',
        new_comp_id,
        user_phone,
        'active',
        1  -- ✅ FREE TIER: 1 driver only
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        company_id = EXCLUDED.company_id,
        role = 'manager',
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.users.phone),
        status = 'active',
        driver_limit = COALESCE(public.users.driver_limit, 1);  -- Keep existing limit or default to 1

    -- ✅ NO DRIVER CREATION HERE - Users must add drivers manually

    RETURN json_build_object('success', true, 'user_id', new_user_id, 'company_id', new_comp_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_manager_signup TO anon, authenticated, service_role;

-- 3. Verify NO auto-insertion happens
-- Test by checking recent signups
SELECT 
    c.name AS company_name,
    c.created_at,
    COUNT(d.id) AS auto_created_drivers,
    STRING_AGG(d.name, ', ') AS driver_names
FROM public.companies c
LEFT JOIN public.drivers d ON d.company_id = c.id
WHERE c.created_at > NOW() - INTERVAL '1 hour'
GROUP BY c.id, c.name, c.created_at
ORDER BY c.created_at DESC;

COMMIT;

-- SUCCESS MESSAGE
SELECT '✅ Fix applied! New signups will NOT auto-create drivers.' AS status;
SELECT '⚠️ Existing companies with 5 drivers: You may need to manually delete extras.' AS note;
