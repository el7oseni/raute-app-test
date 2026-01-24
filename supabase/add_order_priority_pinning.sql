-- Add Priority and Pinning for Orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS priority_level text DEFAULT 'normal'; -- 'normal', 'high', 'critical'

-- Notify that it's done
DO $$
BEGIN
    RAISE NOTICE 'Added is_pinned and priority_level columns to orders table';
END $$;
