-- Add missing columns to 'orders' table
-- These columns are required by the Route Planner feature

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS route_index INTEGER,
ADD COLUMN IF NOT EXISTS locked_to_driver BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS time_window_start TIME,
ADD COLUMN IF NOT EXISTS time_window_end TIME,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS driver_visible_overrides TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Verify the columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders'
AND column_name IN ('route_index', 'locked_to_driver', 'time_window_start', 'time_window_end', 'delivered_at', 'custom_fields', 'driver_visible_overrides', 'hub_id')
ORDER BY column_name;
