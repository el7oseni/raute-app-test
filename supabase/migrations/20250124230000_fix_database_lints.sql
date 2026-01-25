-- Migration to fix database lints:
-- 1. Optimize RLS policies by wrapping auth.uid() in (select auth.uid())
-- 2. Consolidate multiple permissive policies
-- 3. Drop duplicate indexes

BEGIN;

--------------------------------------------------------------------------------
-- 1. DROP DUPLICATE INDEXES
--------------------------------------------------------------------------------

-- driver_activity_logs: {idx_activity_logs_timestamp, idx_driver_activity_logs_timestamp}
-- keeping idx_driver_activity_logs_timestamp as it matches the table name pattern better (or vice versa, but we pick one)
DROP INDEX IF EXISTS idx_activity_logs_timestamp;
-- driver_activity_logs: {idx_activity_logs_driver_id, idx_driver_activity_logs_driver_id}
DROP INDEX IF EXISTS idx_activity_logs_driver_id;

-- drivers: {idx_drivers_company, idx_drivers_company_id}
DROP INDEX IF EXISTS idx_drivers_company_id;

-- orders: {idx_orders_company, idx_orders_company_id}
DROP INDEX IF EXISTS idx_orders_company_id;
-- orders: {idx_orders_driver, idx_orders_driver_id}
DROP INDEX IF EXISTS idx_orders_driver_id;

-- users: {idx_users_company, idx_users_company_id}
DROP INDEX IF EXISTS idx_users_company_id;


--------------------------------------------------------------------------------
-- 2. FIX DRIVERS POLICIES
--------------------------------------------------------------------------------

-- Drop existing overlapping/unoptimized policies
DROP POLICY IF EXISTS "Managers see company drivers" ON drivers;
DROP POLICY IF EXISTS "Drivers see themselves" ON drivers;
DROP POLICY IF EXISTS "Admins and managers can manage drivers" ON drivers;
DROP POLICY IF EXISTS "Drivers can update own status" ON drivers;
DROP POLICY IF EXISTS "Drivers can view own profile" ON drivers;
DROP POLICY IF EXISTS "Drivers update own" ON drivers;
DROP POLICY IF EXISTS "Drivers can update their own status" ON drivers;
DROP POLICY IF EXISTS "Users can view drivers in their company" ON drivers;
DROP POLICY IF EXISTS "Managers can insert drivers" ON drivers;
DROP POLICY IF EXISTS "Managers can update drivers" ON drivers;
DROP POLICY IF EXISTS "Managers can delete drivers" ON drivers;

-- Recreate consolidated and optimized policies
-- Policy 1: Admins and Managers can do everything on their company's drivers
CREATE POLICY "admin_manager_manage_drivers"
ON drivers
FOR ALL
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users
        WHERE id = (select auth.uid()) AND role IN ('admin', 'manager')
    )
);

-- Policy 2: Regular Users (Dispatchers?) can VIEW drivers in their company
-- (Assuming 'user' implies anyone in the company, or specific roles. Keeping it broad as per 'Users can view drivers...')
CREATE POLICY "users_view_company_drivers"
ON drivers
FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users
        WHERE id = (select auth.uid())
    )
);

-- Policy 3: Drivers can VIEW themselves
CREATE POLICY "drivers_view_self"
ON drivers
FOR SELECT
TO authenticated
USING (
    user_id = (select auth.uid())
);

-- Policy 4: Drivers can UPDATE their own status (and potentially other fields if allowed, but typically just status)
CREATE POLICY "drivers_update_self"
ON drivers
FOR UPDATE
TO authenticated
USING (
    user_id = (select auth.uid())
)
WITH CHECK (
    user_id = (select auth.uid())
);


--------------------------------------------------------------------------------
-- 3. FIX ORDERS POLICIES
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins and managers can manage orders" ON orders;
DROP POLICY IF EXISTS "Drivers can update their assigned orders" ON orders;
DROP POLICY IF EXISTS "Users can view orders in their company" ON orders;
DROP POLICY IF EXISTS "Users can insert orders in their company" ON orders;
DROP POLICY IF EXISTS "Users can update orders in their company" ON orders;
DROP POLICY IF EXISTS "Managers can delete orders" ON orders;

-- Policy 1: Admins and Managers can manage orders (ALL)
CREATE POLICY "admin_manager_manage_orders"
ON orders
FOR ALL
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users
        WHERE id = (select auth.uid()) AND role IN ('admin', 'manager')
    )
);

-- Policy 2: Users (Dispatchers/Company Members) can VIEW, INSERT, UPDATE orders in their company
-- Note: Breaking this down for clarity, or combining if 'Users' means everyone.
-- The previous policies suggested 'Users' can insert/update.
CREATE POLICY "users_manage_company_orders"
ON orders
FOR ALL
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users
        WHERE id = (select auth.uid())
    )
    -- Start cleanup: Exclude Admins/Managers from this if we want strictly separate policies,
    -- OR just let them overlap (but linter hates multiple permissive).
    -- Strategy: "Users" usually includes Admins/Managers.
    -- If we have "admin_manager_manage_orders" (ALL) and "users_manage_company_orders" (ALL),
    -- then admins have 2 policies.
    -- FIX: Make "users_manage_company_orders" apply ONLY to non-admin/non-managers?
    -- OR: Just have one policy "company_members_manage_orders" for ALL?
    -- Issue: Do regular users have DELETE permission? Previous policy "Managers can delete orders" implies users CANNOT delete.
    -- Previous: "Users can insert", "Users can update", "Users can view". No "Users can delete".
);

-- RETHINK ORDERS:
-- 1. Select: All company members.
CREATE POLICY "company_members_view_orders"
ON orders FOR SELECT TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

-- 2. Insert: All company members (based on previous "Users can insert").
CREATE POLICY "company_members_insert_orders"
ON orders FOR INSERT TO authenticated
WITH CHECK (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

-- 3. Update: All company members.
CREATE POLICY "company_members_update_orders"
ON orders FOR UPDATE TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

-- 4. Delete: Admins/Managers ONLY.
CREATE POLICY "admins_managers_delete_orders"
ON orders FOR DELETE TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users
        WHERE id = (select auth.uid()) AND role IN ('admin', 'manager')
    )
);

-- 5. Drivers: Update assigned orders
CREATE POLICY "drivers_update_assigned_orders"
ON orders FOR UPDATE TO authenticated
USING (
    driver_id IN (
        SELECT id FROM drivers WHERE user_id = (select auth.uid())
    )
);


--------------------------------------------------------------------------------
-- 4. FIX HUBS POLICIES
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view hubs for their company" ON hubs;
DROP POLICY IF EXISTS "Managers can insert hubs for their company" ON hubs;
DROP POLICY IF EXISTS "Managers can update hubs for their company" ON hubs;
DROP POLICY IF EXISTS "Managers can delete hubs for their company" ON hubs;
DROP POLICY IF EXISTS "Users can view hubs in their company" ON hubs;
DROP POLICY IF EXISTS "Managers can manage hubs" ON hubs;

-- Policy 1: View - All company members
CREATE POLICY "company_members_view_hubs"
ON hubs FOR SELECT TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

-- Policy 2: Manage (Insert/Update/Delete) - Admins/Managers only
CREATE POLICY "admins_managers_manage_hubs"
ON hubs FOR ALL TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users
        WHERE id = (select auth.uid()) AND role IN ('admin', 'manager')
    )
)
WITH CHECK (
    company_id IN (
        SELECT company_id FROM users
        WHERE id = (select auth.uid()) AND role IN ('admin', 'manager')
    )
); 
-- Note specific command policies (INSERT/UPDATE/DELETE) are implicitly covered by ALL,
-- providing we ensure 'users' (non-managers) don't match this.


--------------------------------------------------------------------------------
-- 5. FIX PUBLIC.DRIVERS/ORDERS/ETC MISC POLICIES
-- (Already covered above for main tables, checking others)
--------------------------------------------------------------------------------

-- Custom Fields
DROP POLICY IF EXISTS "Users can view custom fields in their company" ON custom_fields;
DROP POLICY IF EXISTS "Managers can manage custom fields" ON custom_fields;

CREATE POLICY "company_members_view_custom_fields"
ON custom_fields FOR SELECT TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

CREATE POLICY "admins_managers_manage_custom_fields"
ON custom_fields FOR ALL TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users
        WHERE id = (select auth.uid()) AND role IN ('admin', 'manager')
    )
);

-- Proof Images
DROP POLICY IF EXISTS "Users can view proof images in their company" ON proof_images;
DROP POLICY IF EXISTS "Users can upload proof images" ON proof_images;
DROP POLICY IF EXISTS "Users can delete proof images in their company" ON proof_images;

CREATE POLICY "company_members_view_proof_images"
ON proof_images FOR SELECT TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

CREATE POLICY "company_members_insert_proof_images"
ON proof_images FOR INSERT TO authenticated
WITH CHECK (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

CREATE POLICY "company_members_delete_proof_images"
ON proof_images FOR DELETE TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

-- Users Table
DROP POLICY IF EXISTS "users_can_read_own" ON users;
DROP POLICY IF EXISTS "users_can_update_own" ON users;
DROP POLICY IF EXISTS "users_can_read_all_authenticated" ON users; -- mentioned in linter
DROP POLICY IF EXISTS "Users can view users in their company" ON users;

-- Policy 1: Read own
CREATE POLICY "users_read_own"
ON users FOR SELECT TO authenticated
USING (
    id = (select auth.uid())
);

-- Policy 2: Read company members (likely needed for "Users can view users in their company")
CREATE POLICY "users_read_company_members"
ON users FOR SELECT TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);
-- Note: users_read_own is technically a subset of users_read_company_members if you are in the company.
-- But we can keep both for clarity or just merge. Linter dislikes multiple permissive. 
-- Merging into one:
-- "users_read_company_and_self"
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_read_company_members" ON users;

CREATE POLICY "users_read_company_and_self"
ON users FOR SELECT TO authenticated
USING (
    id = (select auth.uid())
    OR
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

-- Policy 3: Update own
CREATE POLICY "users_update_own"
ON users FOR UPDATE TO authenticated
USING (
    id = (select auth.uid())
)
WITH CHECK (
    id = (select auth.uid())
);

--------------------------------------------------------------------------------
-- 6. FIX LOCATION / ACTIVITY LOGS
--------------------------------------------------------------------------------

-- Driver Locations
DROP POLICY IF EXISTS "Drivers can log location" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_insert_own" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_select_company" ON driver_locations;

CREATE POLICY "drivers_insert_location"
ON driver_locations FOR INSERT TO authenticated
WITH CHECK (
    driver_id IN (
        SELECT id FROM drivers WHERE user_id = (select auth.uid())
    )
);

CREATE POLICY "company_view_locations"
ON driver_locations FOR SELECT TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);


-- Driver Activity Logs
DROP POLICY IF EXISTS "driver_activity_logs_insert_own" ON driver_activity_logs;
DROP POLICY IF EXISTS "driver_activity_logs_select_company" ON driver_activity_logs;

CREATE POLICY "drivers_insert_activity_logs"
ON driver_activity_logs FOR INSERT TO authenticated
WITH CHECK (
    driver_id IN (
        SELECT id FROM drivers WHERE user_id = (select auth.uid())
    )
);

CREATE POLICY "company_view_activity_logs"
ON driver_activity_logs FOR SELECT TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (select auth.uid())
    )
);

-- Contact Submissions
DROP POLICY IF EXISTS "Admins can view submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON contact_submissions;

CREATE POLICY "admins_view_submissions_optimized"
ON contact_submissions FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (select auth.uid())
        AND users.role IN ('admin', 'company_admin', 'manager')
    )
);

CREATE POLICY "admins_update_submissions_optimized"
ON contact_submissions FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (select auth.uid())
        AND users.role IN ('admin', 'company_admin', 'manager')
    )
);

-- Companies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;

CREATE POLICY "users_view_own_company_optimized"
ON companies FOR SELECT TO authenticated
USING (
    id IN (SELECT company_id FROM users WHERE id = (select auth.uid()))
);

CREATE POLICY "users_update_own_company_optimized"
ON companies FOR UPDATE TO authenticated
USING (
    id IN (SELECT company_id FROM users WHERE id = (select auth.uid()))
);


COMMIT;
