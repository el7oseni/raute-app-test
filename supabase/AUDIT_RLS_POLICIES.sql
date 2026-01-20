-- ========================================
-- COMPREHENSIVE RLS POLICY AUDIT & SETUP
-- Run this to ensure all tables have correct Row Level Security
-- ========================================

-- 1. VERIFY USERS TABLE RLS
-- Users must be able to read their own data + driver_limit column
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- 2. VERIFY DRIVERS TABLE RLS
DROP POLICY IF EXISTS "Managers can view company drivers" ON drivers;
CREATE POLICY "Managers can view company drivers" ON drivers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = drivers.company_id
      AND users.role IN ('manager', 'admin', 'dispatcher')
    )
  );

DROP POLICY IF EXISTS "Drivers can view own data" ON drivers;
CREATE POLICY "Drivers can view own data" ON drivers
  FOR SELECT
  USING (user_id = auth.uid());

-- 3. VERIFY ORDERS TABLE RLS
DROP POLICY IF EXISTS "Company members can view orders" ON orders;
CREATE POLICY "Company members can view orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = orders.company_id
    )
  );

DROP POLICY IF EXISTS "Drivers can update assigned orders" ON orders;
CREATE POLICY "Drivers can update assigned orders" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.user_id = auth.uid()
      AND drivers.id = orders.driver_id
    )
  );

-- 4. VERIFY HUBS TABLE RLS
DROP POLICY IF EXISTS "Company members can view hubs" ON hubs;
CREATE POLICY "Company members can view hubs" ON hubs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = hubs.company_id
    )
  );

-- 5. STORAGE POLICIES FOR PROOFS BUCKET
-- (Already created in setup_proofs_storage.sql - verify existence)
SELECT EXISTS(
  SELECT 1 FROM storage.buckets WHERE id = 'proofs'
) AS proofs_bucket_exists;

-- 6. FINAL SANITY CHECK
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'drivers', 'orders', 'hubs', 'companies')
ORDER BY tablename;
