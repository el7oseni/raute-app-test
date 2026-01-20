-- Check all triggers on companies table that might create drivers
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    proname AS function_name,
    tgenabled AS enabled,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.companies'::regclass
ORDER BY tgname;

-- Also check for any function that inserts multiple drivers
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND routine_definition LIKE '%INSERT INTO%drivers%'
ORDER BY routine_name;
