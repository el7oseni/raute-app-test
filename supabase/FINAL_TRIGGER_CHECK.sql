SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';
