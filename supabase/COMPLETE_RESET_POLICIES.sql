-- SIMPLE ROLLBACK: Delete ALL policies first, then restore basic ones
BEGIN;

--------------------------------------------------------------------------------
-- STEP 1: DELETE ALL POLICIES (from both old and new)
--------------------------------------------------------------------------------

-- Users policies
DROP POLICY IF EXISTS "users_read_company_and_self" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_read_company_members" ON users;
DROP POLICY IF EXISTS "users_can_read_own" ON users;
DROP POLICY IF EXISTS "users_can_read_all_authenticated" ON users;
DROP POLICY IF EXISTS "users_can_update_own" ON users;

-- Drivers policies
DROP POLICY IF EXISTS "admin_manager_manage_drivers" ON drivers;
DROP POLICY IF EXISTS "users_view_company_drivers" ON drivers;
DROP POLICY IF EXISTS "drivers_view_self" ON drivers;
DROP POLICY IF EXISTS "drivers_update_self" ON drivers;
DROP POLICY IF EXISTS "Users can view drivers in their company" ON drivers;
DROP POLICY IF EXISTS "Managers can insert drivers" ON drivers;
DROP POLICY IF EXISTS "Managers can update drivers" ON drivers;
DROP POLICY IF EXISTS "Managers can delete drivers" ON drivers;
DROP POLICY IF EXISTS "Admins and managers can manage drivers" ON drivers;
DROP POLICY IF EXISTS "Drivers can update their own status" ON drivers;

-- Orders policies
DROP POLICY IF EXISTS "company_members_view_orders" ON orders;
DROP POLICY IF EXISTS "company_members_insert_orders" ON orders;
DROP POLICY IF EXISTS "company_members_update_orders" ON orders;
DROP POLICY IF EXISTS "admins_managers_delete_orders" ON orders;
DROP POLICY IF EXISTS "drivers_update_assigned_orders" ON orders;
DROP POLICY IF EXISTS "Users can view orders in their company" ON orders;
DROP POLICY IF EXISTS "Users can insert orders in their company" ON orders;
DROP POLICY IF EXISTS "Users can update orders in their company" ON orders;
DROP POLICY IF EXISTS "Managers can delete orders" ON orders;
DROP POLICY IF EXISTS "Admins and managers can manage orders" ON orders;
DROP POLICY IF EXISTS "Drivers can update their assigned orders" ON orders;

-- Hubs policies
DROP POLICY IF EXISTS "company_members_view_hubs" ON hubs;
DROP POLICY IF EXISTS "admins_managers_manage_hubs" ON hubs;
DROP POLICY IF EXISTS "Users can view hubs in their company" ON hubs;
DROP POLICY IF EXISTS "Managers can manage hubs" ON hubs;
DROP POLICY IF EXISTS "Managers can insert hubs for their company" ON hubs;
DROP POLICY IF EXISTS "Managers can update hubs for their company" ON hubs;
DROP POLICY IF EXISTS "Managers can delete hubs for their company" ON hubs;

-- Custom fields policies
DROP POLICY IF EXISTS "company_members_view_custom_fields" ON custom_fields;
DROP POLICY IF EXISTS "admins_managers_manage_custom_fields" ON custom_fields;
DROP POLICY IF EXISTS "Users can view custom fields in their company" ON custom_fields;
DROP POLICY IF EXISTS "Managers can manage custom fields" ON custom_fields;

-- Proof images policies
DROP POLICY IF EXISTS "company_members_view_proof_images" ON proof_images;
DROP POLICY IF EXISTS "company_members_insert_proof_images" ON proof_images;
DROP POLICY IF EXISTS "company_members_delete_proof_images" ON proof_images;
DROP POLICY IF EXISTS "Users can view proof images in their company" ON proof_images;
DROP POLICY IF EXISTS "Users can upload proof images" ON proof_images;
DROP POLICY IF EXISTS "Users can delete proof images in their company" ON proof_images;

-- Driver locations policies
DROP POLICY IF EXISTS "drivers_insert_location" ON driver_locations;
DROP POLICY IF EXISTS "company_view_locations" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_insert_own" ON driver_locations;
DROP POLICY IF EXISTS "driver_locations_select_company" ON driver_locations;
DROP POLICY IF EXISTS "Drivers can log location" ON driver_locations;

-- Driver activity logs policies
DROP POLICY IF EXISTS "drivers_insert_activity_logs" ON driver_activity_logs;
DROP POLICY IF EXISTS "company_view_activity_logs" ON driver_activity_logs;
DROP POLICY IF EXISTS "driver_activity_logs_insert_own" ON driver_activity_logs;
DROP POLICY IF EXISTS "driver_activity_logs_select_company" ON driver_activity_logs;

-- Contact submissions policies
DROP POLICY IF EXISTS "admins_view_submissions_optimized" ON contact_submissions;
DROP POLICY IF EXISTS "admins_update_submissions_optimized" ON contact_submissions;
DROP POLICY IF EXISTS "Admins can view submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON contact_submissions;

-- Companies policies
DROP POLICY IF EXISTS "users_view_own_company_optimized" ON companies;
DROP POLICY IF EXISTS "users_update_own_company_optimized" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;

--------------------------------------------------------------------------------
-- STEP 2: RESTORE BASIC WORKING POLICIES (SIMPLE, NO OPTIMIZATION)
--------------------------------------------------------------------------------

-- Users: Simple read own + update own
CREATE POLICY "users_can_read_own"
ON users FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_can_update_own"
ON users FOR UPDATE TO authenticated
USING (id = auth.uid());

-- Drivers: Basic view for company
CREATE POLICY "Users can view drivers in their company"
ON drivers FOR SELECT TO authenticated
USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Admins and managers can manage drivers"
ON drivers FOR ALL TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "Drivers can update their own status"
ON drivers FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Orders: Basic CRUD
CREATE POLICY "Users can view orders in their company"
ON orders FOR SELECT TO authenticated
USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can insert orders in their company"
ON orders FOR INSERT TO authenticated
WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can update orders in their company"
ON orders FOR UPDATE TO authenticated
USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Managers can delete orders"
ON orders FOR DELETE TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "Drivers can update their assigned orders"
ON orders FOR UPDATE TO authenticated
USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

-- Hubs
CREATE POLICY "Users can view hubs in their company"
ON hubs FOR SELECT TO authenticated
USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Managers can manage hubs"
ON hubs FOR ALL TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Custom fields
CREATE POLICY "Users can view custom fields in their company"
ON custom_fields FOR SELECT TO authenticated
USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Managers can manage custom fields"
ON custom_fields FOR ALL TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Proof images
CREATE POLICY "Users can view proof images in their company"
ON proof_images FOR SELECT TO authenticated
USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can upload proof images"
ON proof_images FOR INSERT TO authenticated
WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can delete proof images in their company"
ON proof_images FOR DELETE TO authenticated
USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Driver locations
CREATE POLICY "driver_locations_insert_own"
ON driver_locations FOR INSERT TO authenticated
WITH CHECK (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

CREATE POLICY "driver_locations_select_company"
ON driver_locations FOR SELECT TO authenticated
USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Driver activity logs
CREATE POLICY "driver_activity_logs_insert_own"
ON driver_activity_logs FOR INSERT TO authenticated
WITH CHECK (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

CREATE POLICY "driver_activity_logs_select_company"
ON driver_activity_logs FOR SELECT TO authenticated
USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Contact submissions
CREATE POLICY "Admins can view submissions"
ON contact_submissions FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'company_admin', 'manager')
    )
);

CREATE POLICY "Admins can update submissions"
ON contact_submissions FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'company_admin', 'manager')
    )
);

-- Companies
CREATE POLICY "Users can view their own company"
ON companies FOR SELECT TO authenticated
USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own company"
ON companies FOR UPDATE TO authenticated
USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

COMMIT;
