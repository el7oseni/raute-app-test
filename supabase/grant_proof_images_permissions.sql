-- ✅ THE REAL FIX: Grant table permissions to authenticated users
-- The issue is NOT RLS policies, it's missing GRANT permissions!

-- Grant ALL permissions on proof_images table to authenticated users
GRANT ALL ON TABLE proof_images TO authenticated;
GRANT ALL ON TABLE proof_images TO anon;

-- Also grant usage on the sequence if it exists (for auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verify grants were applied
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'proof_images'
ORDER BY grantee, privilege_type;
