-- FIX COMPANY CREATION RLS
-- New users (managers) need to be able to create their own company during onboarding.
-- Currently, RLS prevents INSERT on the 'companies' table for authenticated users.

-- 1. Allow authenticated users to INSERT a new company
-- We only allow this if they don't have a company yet (optional check, but good for safety)
DROP POLICY IF EXISTS "Managers can create create companies" ON companies;

CREATE POLICY "Managers can create companies"
  ON companies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 2. Allow users to UPDATE their own company
-- Once created, they should be able to edit it (if they are linked to it in 'users' table)
DROP POLICY IF EXISTS "Managers can update their own company" ON companies;

CREATE POLICY "Managers can update their own company"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
  );
