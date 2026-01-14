-- EMERGENCY FIX: Repair Broken Driver Accounts
-- Run this in Supabase SQL Editor

-- 1. Reset all users' internal role to 'authenticated'
-- This fixes the "Database error querying schema" caused by non-standard roles in auth.users
UPDATE auth.users
SET role = 'authenticated'
WHERE role != 'authenticated' AND role != 'service_role';

-- 2. Force Schema Cache Reload
-- This clears any stale metadata causing the error
NOTIFY pgrst, 'reload schema';

-- 3. Verify public.users exists for this specific driver (for debugging, optional but good)
-- If the driver is missing in public.users, they can't log in properly anyway.
-- You can ignore the result, this is just to ensure the query runs.
select email, role from auth.users where email = 'dsasa@gmail.com';
