-- Debug script to check full user details including metadata
select 
    id, 
    email, 
    role, 
    raw_app_meta_data, 
    raw_user_meta_data 
from auth.users 
where email = 'dsasa@gmail.com';
