-- ============================================
-- UPDATE EXISTING USERS TO 1-DRIVER FREE TIER
-- ============================================
-- This script sets all existing users who haven't purchased
-- a subscription back to the free tier of 1 driver.

-- Update all users who currently have default limit of 5 to 1
-- (Assumes users with limit > 5 have already upgraded)
UPDATE users
SET driver_limit = 1
WHERE driver_limit = 5;

-- Verify the change
SELECT 
    id, 
    email, 
    role, 
    driver_limit,
    created_at
FROM users
WHERE role IN ('manager', 'admin', 'company_admin')
ORDER BY driver_limit, created_at DESC;

-- Expected result: Most users should now have driver_limit = 1 (free tier)
