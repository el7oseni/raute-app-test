-- COMPREHENSIVE FIX: Repair Login for ALL Users (Drivers, Dispatchers, Managers)

-- 1. Fix the internal Auth Role for ALL users
-- This changes any 'driver', 'dispatcher', 'manager' roles in the auth system to 'authenticated'
-- 'authenticated' is the ONLY role Supabase Auth allows to log in securely.
UPDATE auth.users
SET role = 'authenticated'
WHERE role NOT IN ('authenticated', 'service_role');

-- 2. Ensure consistency in Metadata (Optional but Good Practice)
-- This updates the hidden metadata to reflect their actual functional role from public.users
-- so the Frontend knows who they are, while the Backend knows they are allowed to login.
-- (This part requires complex joins, so for safety we just fix the login access first).

-- 3. Force Schema Cache Reload
-- This is critical. It tells Supabase "Hey, I changed the roles, please refresh your permissions cache".
NOTIFY pgrst, 'reload schema';

-- 4. Verification Query
-- Run this to see who still has a weird role (Result should be empty or only service accounts)
SELECT id, email, role FROM auth.users WHERE role NOT IN ('authenticated', 'service_role');
