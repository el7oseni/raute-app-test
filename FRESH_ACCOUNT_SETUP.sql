-- CLEAN SETUP: Create a fresh test account with proper data
-- Run this to start fresh with a new manager account

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: Get or create a company
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Option A: Use existing company (recommended)
SELECT id, name FROM companies ORDER BY created_at DESC LIMIT 5;

-- Get the company_id you want to use, or create a new one:
-- INSERT INTO companies (id, name) VALUES (gen_random_uuid(), 'Test Company');

-- For this script, we'll use the first company. Replace if needed:
DO $$
DECLARE
    target_company_id UUID;
BEGIN
    -- Get the first company (or create one if none exists)
    SELECT id INTO target_company_id FROM companies ORDER BY created_at LIMIT 1;
    
    IF target_company_id IS NULL THEN
        INSERT INTO companies (id, name) 
        VALUES (gen_random_uuid(), 'Test Company')
        RETURNING id INTO target_company_id;
    END IF;
    
    RAISE NOTICE 'Using company_id: %', target_company_id;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: Update ALL orders and drivers to use the FIRST company
-- This ensures everything is in sync
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UPDATE orders
SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1);

UPDATE drivers
SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1);

-- Verify:
SELECT 
    'After Update' as status,
    (SELECT COUNT(DISTINCT company_id) FROM orders) as orders_companies,
    (SELECT COUNT(DISTINCT company_id) FROM drivers) as drivers_companies,
    (SELECT company_id FROM orders LIMIT 1) as company_id_used;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 3: Instructions for creating a new account
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- DO NOT RUN THIS IN SQL - Do this in the browser:
-- 1. Go to: http://localhost:3000/signup
-- 2. Create a new account with:
--    Email: testmanager@test.com
--    Password: 12345678
--    Full Name: Test Manager
-- 3. After signup, come back here to run STEP 4

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 4: After creating account, link it to the company
-- Run this AFTER you sign up in the browser
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- First, find the newly created user in auth.users:
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'testmanager@test.com';  -- Replace with your email

-- Then run this (REPLACE the UUID with the one from above):
/*
DO $$
DECLARE
    new_user_id UUID := 'PASTE_USER_ID_HERE';  -- Replace this!
    target_company_id UUID;
BEGIN
    -- Get the company ID
    SELECT id INTO target_company_id FROM companies ORDER BY created_at LIMIT 1;
    
    -- Insert or update user in public.users
    INSERT INTO public.users (id, company_id, email, full_name, role, status)
    VALUES (
        new_user_id,
        target_company_id,
        'testmanager@test.com',  -- Replace with your email
        'Test Manager',
        'manager',
        'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        company_id = target_company_id,
        role = 'manager',
        status = 'active';
    
    RAISE NOTICE 'User linked to company: %', target_company_id;
END $$;
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 5: FINAL VERIFICATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Verify everything is correct:
SELECT 
    u.email as user_email,
    u.role,
    u.company_id as user_company,
    c.name as company_name,
    COUNT(DISTINCT o.id) as orders_count,
    COUNT(DISTINCT d.id) as drivers_count
FROM public.users u
JOIN companies c ON c.id = u.company_id
LEFT JOIN orders o ON o.company_id = u.company_id
LEFT JOIN drivers d ON d.company_id = u.company_id
WHERE u.email = 'testmanager@test.com'  -- Replace with your email
GROUP BY u.email, u.role, u.company_id, c.name;

-- Expected result:
-- - role = 'manager'
-- - orders_count should match total orders (run: SELECT COUNT(*) FROM orders)
-- - drivers_count should match total drivers (run: SELECT COUNT(*) FROM drivers)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- QUICK SUMMARY OF WHAT TO DO:
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- 1. Run STEP 2 (update orders and drivers company_id)
-- 2. Sign up with a new account at http://localhost:3000/signup
-- 3. Get the new user ID from auth.users
-- 4. Run STEP 4 (link user to company)
-- 5. Run STEP 5 (verify)
-- 6. Login with the new account
-- 7. Go to /map and see the data!
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
