-- DISABLE SAFETY TRIGGERS
-- Temporarily disable "Business Logic" triggers to see if they are crashing Login.

DROP TRIGGER IF EXISTS enforce_driver_limit ON public.drivers;
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;

-- Also drop them from the other tables if they exist (just to be safe)
DROP TRIGGER IF EXISTS enforce_driver_limit ON public.users; 
