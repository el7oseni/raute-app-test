-- NUCLEAR OPTION - Drop ALL triggers on auth.users
-- This will help us isolate the exact problem

-- 1. List ALL triggers first (to see what we're dealing with)
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- 2. Drop them ALL (uncomment after reviewing the list above)
/*
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers
        WHERE event_object_schema = 'auth' 
        AND event_object_table = 'users'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.trigger_name);
    END LOOP;
END $$;
*/
