-- MISSING TABLES & FUNCTIONS
-- Add to existing schema

-- 1. Custom Fields Table
CREATE TABLE IF NOT EXISTS custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'driver')),
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'textarea')),
    field_label TEXT NOT NULL,
    placeholder TEXT,
    options TEXT[], -- For select type
    is_required BOOLEAN DEFAULT false,
    driver_visible BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_fields_company ON custom_fields(company_id);
CREATE INDEX idx_custom_fields_entity ON custom_fields(entity_type);

-- 2. Hubs Table (for driver start locations)
CREATE TABLE IF NOT EXISTS hubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hubs_company ON hubs(company_id);

-- 3. Update orders table to support custom fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_visible_overrides TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_index INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS locked_to_driver BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS time_window_start TIME;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS time_window_end TIME;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- 4. Update drivers table for additional features
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS custom_values JSONB DEFAULT '{}'::jsonb;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS default_start_address TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS default_start_lat DECIMAL(10, 8);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS default_start_lng DECIMAL(11, 8);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10, 8);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_lng DECIMAL(11, 8);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- 5. Create create_driver_account function
CREATE OR REPLACE FUNCTION create_driver_account(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_phone TEXT,
    p_company_id UUID,
    p_vehicle_type TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_driver_id UUID;
BEGIN
    -- Create auth user
    INSERT INTO auth.users (
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        role
    ) VALUES (
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        jsonb_build_object('full_name', p_full_name, 'role', 'driver'),
        'authenticated'
    ) RETURNING id INTO v_user_id;

    -- Create driver record
    INSERT INTO drivers (
        company_id,
        user_id,
        name,
        phone,
        vehicle_type,
        status
    ) VALUES (
        p_company_id,
        v_user_id,
        p_full_name,
        p_phone,
        p_vehicle_type,
        'active'
    ) RETURNING id INTO v_driver_id;

    -- Create user profile
    INSERT INTO users (
        id,
        company_id,
        email,
        full_name,
        role
    ) VALUES (
        v_user_id,
        p_company_id,
        p_email,
        p_full_name,
        'driver'
    );

    RETURN json_build_object(
        'user_id', v_user_id,
        'driver_id', v_driver_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Policies for new tables
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom_fields in their company"
    ON custom_fields FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Managers can manage custom_fields"
    ON custom_fields FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can view hubs in their company"
    ON hubs FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Managers can manage hubs"
    ON hubs FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- 7. Grants
GRANT SELECT ON custom_fields TO authenticated;
GRANT SELECT ON hubs TO authenticated;
GRANT ALL ON custom_fields TO service_role;
GRANT ALL ON hubs TO service_role;
GRANT EXECUTE ON FUNCTION create_driver_account TO service_role;

-- Success
SELECT 'Missing tables and functions added successfully!' as status;
