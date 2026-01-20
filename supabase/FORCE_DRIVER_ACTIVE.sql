-- Force Driver11 to be active (temporary fix)
UPDATE public.drivers
SET status = 'active'
WHERE email = 'driver11@gmail.com';

-- Verify
SELECT id, name, email, status, updated_at
FROM public.drivers
WHERE email = 'driver11@gmail.com';
