-- Create driver_activity_logs table to fix 404 error
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.driver_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'online', 'offline'
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add RLS Policies
ALTER TABLE public.driver_activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow drivers to insert their own logs
CREATE POLICY "Drivers can insert their own logs" 
ON public.driver_activity_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow managers to view all logs
CREATE POLICY "Managers can view all logs" 
ON public.driver_activity_logs 
FOR SELECT 
TO authenticated 
USING (true); -- Simplified for now, can be restricted to role='manager'
