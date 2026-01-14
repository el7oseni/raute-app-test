-- TEMPORARY WORKAROUND: Disable the signup trigger completely
-- This will let us isolate if it's the trigger causing the login crash

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Note: This means NEW signups won't auto-create profiles
-- But existing users (like loloz@gmail.com) should be able to login
