-- INSPECT TRIGGERS ON AUTH.USERS
-- We are looking for custom triggers that run on UPDATE
-- and might be crashing the login process.

SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.action_statement,
    t.action_orientation,
    p.prosrc as function_source
FROM information_schema.triggers t
LEFT JOIN pg_proc p ON p.proname = substring(t.action_statement from 'EXECUTE FUNCTION (.*)\(')
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- ALSO CHECK policies just in case
SELECT * FROM pg_policies WHERE schemaname = 'auth' AND tablename = 'users';
