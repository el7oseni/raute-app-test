-- 🔒 CRITICAL SECURITY FIX: Re-enable RLS on all tables
-- This script enables Row Level Security and creates company-based policies

-- ========================================
-- 1. ENABLE RLS ON ALL CORE TABLES
-- ========================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_activity_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. COMPANIES TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company"
    ON companies FOR SELECT
    TO authenticated
    USING (
        id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own company" ON companies;
CREATE POLICY "Users can update their own company"
    ON companies FOR UPDATE
    TO authenticated
    USING (
        id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    )
    WITH CHECK (
        id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

-- ========================================
-- 3. USERS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view users in their company" ON users;
CREATE POLICY "Users can view users in their company"
    ON users FOR SELECT
    TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ========================================
-- 4. DRIVERS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view drivers in their company" ON drivers;
CREATE POLICY "Users can view drivers in their company"
    ON drivers FOR SELECT
    TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

DROP POLICY IF EXISTS "Managers can insert drivers" ON drivers;
CREATE POLICY "Managers can insert drivers"
    ON drivers FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
    );

DROP POLICY IF EXISTS "Managers can update drivers" ON drivers;
CREATE POLICY "Managers can update drivers"
    ON drivers FOR UPDATE
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
    );

DROP POLICY IF EXISTS "Managers can delete drivers" ON drivers;
CREATE POLICY "Managers can delete drivers"
    ON drivers FOR DELETE
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
    );

-- ========================================
-- 5. ORDERS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view orders in their company" ON orders;
CREATE POLICY "Users can view orders in their company"
    ON orders FOR SELECT
    TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert orders in their company" ON orders;
CREATE POLICY "Users can insert orders in their company"
    ON orders FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update orders in their company" ON orders;
CREATE POLICY "Users can update orders in their company"
    ON orders FOR UPDATE
    TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

DROP POLICY IF EXISTS "Managers can delete orders" ON orders;
CREATE POLICY "Managers can delete orders"
    ON orders FOR DELETE
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
    );

-- ========================================
-- 6. PROOF_IMAGES TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view proof images in their company" ON proof_images;
CREATE POLICY "Users can view proof images in their company"
    ON proof_images FOR SELECT
    TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can upload proof images" ON proof_images;
CREATE POLICY "Users can upload proof images"
    ON proof_images FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete proof images in their company" ON proof_images;
CREATE POLICY "Users can delete proof images in their company"
    ON proof_images FOR DELETE
    TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

-- ========================================
-- 7. HUBS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view hubs in their company" ON hubs;
CREATE POLICY "Users can view hubs in their company"
    ON hubs FOR SELECT
    TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

DROP POLICY IF EXISTS "Managers can manage hubs" ON hubs;
CREATE POLICY "Managers can manage hubs"
    ON hubs FOR ALL
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
    );

-- ========================================
-- 8. CUSTOM_FIELDS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view custom fields in their company" ON custom_fields;
CREATE POLICY "Users can view custom fields in their company"
    ON custom_fields FOR SELECT
    TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
    );

DROP POLICY IF EXISTS "Managers can manage custom fields" ON custom_fields;
CREATE POLICY "Managers can manage custom fields"
    ON custom_fields FOR ALL
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
    );

-- ========================================
-- 9. DRIVER_ACTIVITY_LOGS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view activity logs in their company" ON driver_activity_logs;
CREATE POLICY "Users can view activity logs in their company"
    ON driver_activity_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = driver_activity_logs.driver_id 
            AND drivers.company_id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Drivers can insert their own activity logs" ON driver_activity_logs;
CREATE POLICY "Drivers can insert their own activity logs"
    ON driver_activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = driver_activity_logs.driver_id 
            AND drivers.user_id = auth.uid()
        )
    );

-- ========================================
-- 10. VERIFY RLS IS ENABLED
-- ========================================

SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED' 
        ELSE '❌ DISABLED' 
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'companies', 'users', 'drivers', 'orders', 
        'proof_images', 'hubs', 'custom_fields', 'driver_activity_logs'
    )
ORDER BY tablename;
