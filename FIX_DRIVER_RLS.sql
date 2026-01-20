
-- FIX RLS POLICIES FOR DRIVER REDIRECT
-- The issue is likely that the driver cannot read their own record from 'users' or 'drivers' table due to strict RLS.
-- This script ensures valid policies exist.

-- 1. Enable RLS on tables (just to be safe)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- 2. Policy for USERS table: Allow users to read their own data
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- 3. Policy for DRIVERS table: Allow drivers to read their own driver profile
-- This is critical for the fallback check: "Are you a driver?"
DROP POLICY IF EXISTS "Drivers can view own driver profile" ON public.drivers;
CREATE POLICY "Drivers can view own driver profile" 
ON public.drivers FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- 4. Just in case checking 'drivers' table generally (for managers)
-- Managers might need to see all drivers, but for now let's ensure the driver can see themselves.

-- DEBUG: Verify the user role for driver7@gmail.com
SELECT id, email, role FROM auth.users WHERE email = 'driver7@gmail.com';

-- Verify entries in public tables
SELECT * FROM public.users WHERE email = 'driver7@gmail.com';
SELECT * FROM public.drivers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'driver7@gmail.com');
