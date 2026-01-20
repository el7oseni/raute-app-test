-- Check RLS policies on drivers table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'drivers'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'drivers';

-- Try to update directly (as superuser/service role)
UPDATE public.drivers
SET status = 'inactive'
WHERE email = 'driver11@gmail.com'
RETURNING id, name, email, status;
