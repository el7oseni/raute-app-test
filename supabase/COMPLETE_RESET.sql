-- COMPLETE DATABASE RESET
-- Run this AFTER the project restart

-- 1. Clean public schema completely
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 2. Grant permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 3. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Success message
SELECT 'Database reset complete! Now run schema.sql' as status;
