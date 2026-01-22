-- Final cleanup: Fix remaining warnings

-- ==================================================
-- 1. Fix the 2 remaining functions with wrong params
-- ==================================================

-- complete_manager_signup has 5 params (not 4!)
DO $$
BEGIN
    ALTER FUNCTION public.complete_manager_signup(text, text, text, text, text) 
    SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: complete_manager_signup (5 params)';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: complete_manager_signup (5 params not found)';
END $$;

-- create_driver_account has different signature (10 params with different types)
DO $$
BEGIN
    ALTER FUNCTION public.create_driver_account(text, text, text, uuid, text, text, text, numeric, numeric, jsonb) 
    SET search_path = public, pg_temp;
    RAISE NOTICE '✅ Fixed: create_driver_account (correct signature)';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE '⏭️ Skipped: create_driver_account (not found)';
END $$;

-- ==================================================
-- 2. Clean up ALL proof_images policies (old and new)
-- ==================================================

-- Drop ANY existing policies (both old permissive and new ones)
DROP POLICY IF EXISTS "Allow authenticated INSERT" ON proof_images;
DROP POLICY IF EXISTS "Allow authenticated DELETE" ON proof_images;
DROP POLICY IF EXISTS "Allow authenticated SELECT" ON proof_images;
DROP POLICY IF EXISTS "Users can view proof images in their company" ON proof_images;
DROP POLICY IF EXISTS "Users can upload proof images" ON proof_images;
DROP POLICY IF EXISTS "Users can delete proof images in their company" ON proof_images;

-- Create proper company-based policies (clean slate)
CREATE POLICY "Users can view proof images in their company"
    ON proof_images FOR SELECT
    TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

CREATE POLICY "Users can upload proof images"
    ON proof_images FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

CREATE POLICY "Users can delete proof images in their company"
    ON proof_images FOR DELETE
    TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

-- ==================================================
-- 3. Verify everything is fixed
-- ==================================================

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual = 'true' OR with_check = 'true' THEN '⚠️ Permissive'
        ELSE '✅ Secure'
    END as status
FROM pg_policies
WHERE tablename IN ('proof_images', 'contact_submissions')
ORDER BY tablename, policyname;
