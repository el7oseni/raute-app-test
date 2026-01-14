-- DIAGNOSTIC: List all triggers on auth.users
-- The 500 error during login usually comes from a broken trigger trying to run when 'last_sign_in_at' updates.

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- Also check if there are any broken functions that might be called.
-- (Just listing triggers is the most important first step)
