-- FIND ALL TRIGGERS
-- List every single trigger in the database to find hidden crashers.

SELECT 
    trigger_schema,
    trigger_name,
    event_object_schema as table_schema,
    event_object_table as table_name,
    action_statement as trigger_code,
    action_timing,
    event_manipulation
FROM information_schema.triggers
ORDER BY event_object_table, trigger_name;
