-- Add Manual Starting Points for Drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS starting_point_lat float8;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS starting_point_lng float8;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS starting_point_address text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS use_manual_start boolean DEFAULT false;

-- Notify that it's done
DO $$
BEGIN
    RAISE NOTICE 'Added starting_point columns to drivers table';
END $$;
