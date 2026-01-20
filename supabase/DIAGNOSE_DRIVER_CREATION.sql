-- Query to check what drivers are being created for new companies
-- Run this in Supabase SQL Editor to see all drivers

-- 1. Check all drivers grouped by company
SELECT 
    c.name AS company_name,
    c.created_at AS company_created,
    COUNT(d.id) AS driver_count,
    STRING_AGG(d.name, ', ') AS driver_names,
    STRING_AGG(d.vehicle_type, ', ') AS vehicle_types
FROM public.companies c
LEFT JOIN public.drivers d ON d.company_id = c.id
GROUP BY c.id, c.name, c.created_at
ORDER BY c.created_at DESC
LIMIT 10;

-- 2. Check the most recent company's drivers in detail
SELECT 
    c.name AS company_name,
    d.name AS driver_name,
    d.email AS driver_email,
    d.vehicle_type,
    d.status,
    d.user_id,
    d.created_at
FROM public.drivers d
JOIN public.companies c ON c.id = d.company_id
WHERE c.id = (SELECT id FROM public.companies ORDER BY created_at DESC LIMIT 1)
ORDER BY d.created_at;

-- 3. Check if there are any AFTER INSERT triggers on companies
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger 
WHERE tgrelid = 'public.companies'::regclass
AND tgtype & 4 = 4  -- AFTER trigger
ORDER BY tgname;

-- 4. List all functions that insert into drivers table
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) ILIKE '%INSERT INTO%drivers%'
ORDER BY p.proname;
