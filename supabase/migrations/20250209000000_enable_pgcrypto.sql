-- ============================================
-- ENABLE PGCRYPTO EXTENSION FOR PASSWORD HASHING
-- ============================================
-- Migration: 20250209000000_enable_pgcrypto
-- Purpose: Enable pgcrypto extension to support gen_salt() and crypt() functions
--          required for secure password hashing in dispatcher and driver creation

-- Enable the pgcrypto extension (idempotent - safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify extension is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
    ) THEN
        RAISE EXCEPTION 'pgcrypto extension failed to enable';
    END IF;
END $$;
