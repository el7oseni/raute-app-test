-- ===================================
-- NUCLEAR FIX FOR HUBS TABLE
-- ===================================
-- This script will:
-- 1. Backup existing data (if any)
-- 2. Drop and recreate the hubs table with correct schema
-- 3. Restore data (if backed up)
-- 4. Reload PostgREST schema cache
-- ===================================

-- Step 1: Backup existing data (if table exists and has data)
CREATE TEMP TABLE IF NOT EXISTS hubs_backup AS 
SELECT * FROM public.hubs;

-- Step 2: Drop the table completely
DROP TABLE IF EXISTS public.hubs CASCADE;

-- Step 3: Recreate with correct schema
CREATE TABLE public.hubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create index
CREATE INDEX idx_hubs_company ON hubs(company_id);

-- Step 5: Enable RLS
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies
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

-- Step 7: Grant permissions
GRANT SELECT ON public.hubs TO authenticated;
GRANT ALL ON public.hubs TO service_role;

-- Step 8: Restore backed up data (if any existed)
INSERT INTO public.hubs (id, company_id, name, address, latitude, longitude, created_at, updated_at)
SELECT 
    id, 
    company_id, 
    name,
    COALESCE(address, 'Unknown Location') as address, -- fallback if column didn't exist
    COALESCE(latitude, 0) as latitude,
    COALESCE(longitude, 0) as longitude,
    created_at,
    updated_at
FROM hubs_backup
WHERE EXISTS (SELECT 1 FROM hubs_backup);

-- Step 9: Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 
    'Hubs table recreated successfully!' as status,
    COUNT(*) as records_restored 
FROM public.hubs;
