-- DEEP DIAGNOSTIC: Instance ID & Hooks
-- The 500 error might be because the user belongs to the "wrong" instance, 
-- or there's a hidden Hook function crashing the system.

-- 1. Compare Instance ID (Manager vs Driver)
SELECT 
    role, 
    email, 
    instance_id 
FROM auth.users 
WHERE email IN ('test@gmail.com', 'loloz@gmail.com');
-- Replace 'test@gmail.com' with the email of the WORKING manager account

-- 2. Check for Auth Hooks (Functions in auth schema)
-- These run automatically on login and can crash the request
SELECT 
    routine_name, 
    routine_type, 
    security_type
FROM information_schema.routines
WHERE routine_schema = 'auth'
AND routine_name NOT LIKE 'email%'; -- Ignore standard email functions

-- 3. Check for specific triggers on public.users (that might fire on sync)
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
AND event_object_table = 'users';

-- 4. Check Language Validators (Just in case plpgsql is broken)
SELECT lanname, lanvalidator FROM pg_language WHERE lanname = 'plpgsql';
