-- Verify and Fix Driver Location Update Policy

-- 1. Ensure drivers can update their own rows
DROP POLICY IF EXISTS "Drivers can update their own status" ON drivers;
CREATE POLICY "Drivers can update their own status"
ON drivers FOR UPDATE
TO authenticated
USING ( user_id = auth.uid() )
WITH CHECK ( user_id = auth.uid() );

-- 2. Ensure driver_locations insert is allowed
DROP POLICY IF EXISTS "Drivers can log location" ON driver_locations;
CREATE POLICY "Drivers can log location"
ON driver_locations FOR INSERT
TO authenticated
WITH CHECK ( 
  EXISTS ( SELECT 1 FROM drivers WHERE id = driver_locations.driver_id AND user_id = auth.uid() )
);
