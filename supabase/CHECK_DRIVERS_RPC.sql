-- Check the get_company_drivers RPC definition
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_company_drivers';

-- Also check if there's a view on drivers table
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_name LIKE '%driver%';
