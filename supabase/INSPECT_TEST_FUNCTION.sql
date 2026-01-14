-- Check what test_login_update does
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'test_login_update';

-- Also check if there's a trigger using it
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE action_statement LIKE '%test_login_update%';
