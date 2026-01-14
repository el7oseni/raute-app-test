-- Check for triggers on auth.users that might be reverting the role
select 
    event_object_schema as table_schema,
    event_object_table as table_name,
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
from information_schema.triggers
where event_object_table = 'users'
and event_object_schema = 'auth';
