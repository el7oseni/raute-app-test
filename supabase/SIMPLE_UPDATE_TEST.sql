-- Simple direct update test
UPDATE public.drivers
SET status = 'inactive'
WHERE email = 'driver11@gmail.com'
RETURNING id, name, email, status;
