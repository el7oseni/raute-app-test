-- CHECK IF UPDATE HAPPENED
-- Let's see if the 'last_sign_in_at' changed for our test user
SELECT 
    email, 
    last_sign_in_at,
    (last_sign_in_at > (now() - interval '5 minutes')) as recently_updated
FROM auth.users 
WHERE email = 'test_clean@gmail.com';
