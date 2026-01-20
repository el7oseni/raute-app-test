-- Check Driver11 status
SELECT id, name, email, status, company_id
FROM public.drivers
WHERE email = 'driver11@gmail.com';

-- Fix: Set Driver11 to active
UPDATE public.drivers
SET status = 'active'
WHERE email = 'driver11@gmail.com';

-- Verify all active drivers
SELECT id, name, email, status, company_id
FROM public.drivers
WHERE status = 'active'
ORDER BY name;
