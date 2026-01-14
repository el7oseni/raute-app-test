-- Check handle_new_user_signup function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_new_user_signup';

-- Also check if there are any triggers on UPDATE for auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users'
AND event_manipulation = 'UPDATE';
