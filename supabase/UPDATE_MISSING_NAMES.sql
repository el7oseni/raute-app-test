-- Update full_name for users who don't have one
-- Extract username from email (part before @)

UPDATE public.users
SET full_name = SPLIT_PART(email, '@', 1)
WHERE full_name IS NULL OR full_name = ''
  AND email IS NOT NULL
  AND email != '';

-- Verify the update
SELECT id, email, full_name, role
FROM public.users
WHERE email IS NOT NULL
ORDER BY created_at DESC;
