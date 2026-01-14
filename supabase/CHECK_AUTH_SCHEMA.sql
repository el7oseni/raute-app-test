-- Check auth schema migrations
-- This will show if the auth schema is incomplete or corrupted

SELECT * FROM auth.schema_migrations 
ORDER BY version DESC;

-- Also check if auth.users table structure is correct
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;
