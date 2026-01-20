-- Check for any triggers on drivers table that might be resetting the status
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'drivers'
ORDER BY trigger_name;
