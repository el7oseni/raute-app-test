-- ============================================
-- ENABLE PGCRYPTO EXTENSION
-- ============================================
-- This extension provides cryptographic functions including gen_salt
-- which is required for password hashing in driver creation

-- Enable the pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify extension is enabled
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pgcrypto';

-- Test gen_salt function
SELECT gen_salt('bf', 8);
