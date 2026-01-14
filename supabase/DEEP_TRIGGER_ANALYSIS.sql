-- Deep dive into what's breaking login
-- Check ALL triggers on auth.users AND their functions

-- 1. Get all triggers
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.action_timing,
    t.action_statement,
    p.proname as function_name
FROM information_schema.triggers t
LEFT JOIN pg_trigger pt ON pt.tgname = t.trigger_name
LEFT JOIN pg_proc p ON p.oid = pt.tgfoid
WHERE t.event_object_schema = 'auth' 
AND t.event_object_table = 'users'
ORDER BY t.action_timing, t.event_manipulation;
