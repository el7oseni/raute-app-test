-- ============================================
-- CREATE LOCATION TRACKING TABLES
-- ============================================
-- This script creates the necessary tables for driver location tracking
-- and activity logging.

-- 1. Create driver_locations table (Location History)
CREATE TABLE IF NOT EXISTS public.driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create driver_activity_logs table (Online/Offline Events)
CREATE TABLE IF NOT EXISTS public.driver_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('went_online', 'went_offline')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_company_id ON public.driver_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON public.driver_locations(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_driver_activity_logs_driver_id ON public.driver_activity_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_activity_logs_company_id ON public.driver_activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_activity_logs_timestamp ON public.driver_activity_logs(timestamp DESC);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - driver_locations
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS driver_locations_insert_own ON public.driver_locations;
DROP POLICY IF EXISTS driver_locations_select_company ON public.driver_locations;

-- Allow drivers to insert their own locations
CREATE POLICY driver_locations_insert_own ON public.driver_locations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        driver_id IN (
            SELECT id FROM public.drivers WHERE user_id = auth.uid()
        )
    );

-- Allow users to view locations within their company
CREATE POLICY driver_locations_select_company ON public.driver_locations
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

-- ============================================
-- RLS POLICIES - driver_activity_logs
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS driver_activity_logs_insert_own ON public.driver_activity_logs;
DROP POLICY IF EXISTS driver_activity_logs_select_company ON public.driver_activity_logs;

-- Allow drivers to insert their own activity logs
CREATE POLICY driver_activity_logs_insert_own ON public.driver_activity_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        driver_id IN (
            SELECT id FROM public.drivers WHERE user_id = auth.uid()
        )
    );

-- Allow users to view activity logs within their company
CREATE POLICY driver_activity_logs_select_company ON public.driver_activity_logs
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant table permissions to authenticated users
GRANT ALL ON TABLE public.driver_locations TO authenticated;
GRANT ALL ON TABLE public.driver_activity_logs TO authenticated;

-- Grant sequence permissions (for auto-increment if needed)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tables were created
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('driver_locations', 'driver_activity_logs');

-- Verify policies
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('driver_locations', 'driver_activity_logs')
ORDER BY tablename, policyname;
