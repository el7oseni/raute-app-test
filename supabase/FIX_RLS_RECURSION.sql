-- FIX RLS RECURSION
-- This script fixes the "No Role" issue and Driver Login loops
-- by adding a non-recursive policy for self-access.

-- 1. Drop the problematic policies that might cause recursion
DROP POLICY IF EXISTS "Users can view users in their company" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- 2. Add the "Golden Rule" - You can ALWAYS see yourself
-- This breaks the recursion because it doesn't need to look at company_id to know if it's you.
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING ( auth.uid() = id );

-- 3. Add the Company Rule for viewing OTHERS (e.g. Managers viewing Drivers)
-- We check if the target user's company_id matches the current user's company_id.
-- Note: This might still recurse if we aren't careful, so we make sure the first policy handles "self".
CREATE POLICY "Users can view company members"
ON public.users
FOR SELECT
USING (
  auth.uid() != id  -- Only apply this check for OTHER people
  AND
  company_id IN (
    SELECT company_id FROM public.users WHERE id = auth.uid()
  )
);

-- 4. Allow Self-Update (for profile editing)
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );

-- 5. Grant necessary permissions (just in case)
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
