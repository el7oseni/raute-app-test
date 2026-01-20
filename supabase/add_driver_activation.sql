-- ============================================
-- DRIVER/DISPATCHER ACTIVATION SYSTEM
-- ============================================
-- Purpose: Add activation control for drivers/dispatchers
-- Ensures managers must manually activate new accounts

-- 1. Add is_active column to drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- 2. Add comment for documentation
COMMENT ON COLUMN drivers.is_active IS 'Manager must activate driver before they can receive orders';

-- 3. Create index for performance (filtering active drivers)
CREATE INDEX IF NOT EXISTS idx_drivers_active 
ON drivers(is_active) 
WHERE is_active = TRUE;

-- 4. Update existing drivers to ACTIVE (one-time migration)
-- This prevents breaking existing production drivers
UPDATE drivers 
SET is_active = TRUE 
WHERE is_active IS NULL OR is_active = FALSE;

-- 5. Verify the migration
SELECT 
    COUNT(*) as total_drivers,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_drivers,
    COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_drivers
FROM drivers;
