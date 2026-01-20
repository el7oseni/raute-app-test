-- ============================================
-- CREATE DRIVER ACTIVITY LOGS TABLE
-- ============================================
-- Tracks driver online/offline status and shift history

CREATE TABLE IF NOT EXISTS public.driver_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Activity tracking
    status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'on_break', 'driving', 'idle')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Optional metadata
    metadata JSONB,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_activity_logs_driver_id ON public.driver_activity_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_activity_logs_company_id ON public.driver_activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_activity_logs_timestamp ON public.driver_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_driver_activity_logs_status ON public.driver_activity_logs(status, timestamp DESC);

-- RLS Policies
ALTER TABLE public.driver_activity_logs ENABLE ROW LEVEL SECURITY;

-- Company members can view their company's driver logs
DROP POLICY IF EXISTS "Company members can view driver logs" ON public.driver_activity_logs;
CREATE POLICY "Company members can view driver logs" ON public.driver_activity_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.company_id = driver_activity_logs.company_id
        )
    );

-- Drivers can insert their own logs
DROP POLICY IF EXISTS "Drivers can insert own logs" ON public.driver_activity_logs;
CREATE POLICY "Drivers can insert own logs" ON public.driver_activity_logs
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- Managers can insert logs for their company drivers
DROP POLICY IF EXISTS "Managers can insert driver logs" ON public.driver_activity_logs;
CREATE POLICY "Managers can insert driver logs" ON public.driver_activity_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.company_id = driver_activity_logs.company_id
            AND users.role IN ('manager', 'admin', 'company_admin')
        )
    );

-- Function: Auto-populate company_id from driver
CREATE OR REPLACE FUNCTION public.populate_driver_log_company_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Get company_id from driver
    SELECT company_id INTO NEW.company_id
    FROM public.drivers
    WHERE id = NEW.driver_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_populate_driver_log_company_id ON public.driver_activity_logs;
CREATE TRIGGER trg_populate_driver_log_company_id
    BEFORE INSERT ON public.driver_activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.populate_driver_log_company_id();

-- Verify setup
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'driver_activity_logs';
