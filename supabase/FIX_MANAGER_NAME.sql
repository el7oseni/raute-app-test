-- Manual fix for sing@gmail.com
-- Update from "Manager" to actual name

UPDATE public.users
SET full_name = 'sing'
WHERE email = 'sing@gmail.com';

-- Verify
SELECT id, email, full_name, role
FROM public.users
WHERE email = 'sing@gmail.com';
