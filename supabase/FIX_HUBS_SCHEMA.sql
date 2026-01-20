-- Add missing 'address' column to 'hubs' table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'hubs' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE public.hubs ADD COLUMN address TEXT;
    END IF;

    -- Also check for lat/lng to be safe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'hubs' 
        AND column_name = 'latitude'
    ) THEN
        ALTER TABLE public.hubs ADD COLUMN latitude DECIMAL(10, 8);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'hubs' 
        AND column_name = 'longitude'
    ) THEN
        ALTER TABLE public.hubs ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
END $$;
