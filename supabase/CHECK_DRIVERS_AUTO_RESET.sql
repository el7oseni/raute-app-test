-- Check all triggers on drivers table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'drivers'
ORDER BY trigger_name;

-- Check for any functions that might auto-update status
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%drivers%'
  AND routine_definition ILIKE '%status%'
  AND routine_definition ILIKE '%active%'
ORDER BY routine_name;
