-- Manual test: Set driver to inactive
UPDATE public.drivers
SET status = 'inactive'
WHERE email = 'driver11@gmail.com';

-- Wait 2 seconds, then check if it changed back
-- (Run this query multiple times)
SELECT id, name, email, status, updated_at
FROM public.drivers
WHERE email = 'driver11@gmail.com';
