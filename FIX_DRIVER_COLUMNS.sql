-- Add missing columns to drivers table to fix 400 Bad Request error
-- Run this in the Supabase SQL Editor

ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS custom_values JSONB DEFAULT '{}'::jsonb;

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND column_name IN ('phone', 'vehicle_type', 'custom_values');
