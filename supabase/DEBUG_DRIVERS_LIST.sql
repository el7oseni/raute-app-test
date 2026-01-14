-- 1. Check the Company ID of the current logged-in user (loloz@gmail.com)
SELECT id AS user_id, email, company_id, role, full_name 
FROM public.users 
WHERE email = 'loloz@gmail.com';

-- 2. Check ALL drivers and their company_ids
SELECT d.id AS driver_id, d.name, d.company_id, u.email AS linked_user_email
FROM public.drivers d
LEFT JOIN public.users u ON d.user_id = u.id;

-- 3. Run the RPC logic manually to see what it returns for this user
-- (We will replace the ID below with the one found in step 1 if needed, but for now let's just see data)
