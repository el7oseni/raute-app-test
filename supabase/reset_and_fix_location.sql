-- Force Reset Driver Location
-- وهذا سيجعل السائق يظهر "بدون موقع" حتى يتم إرسال موقع جديد
UPDATE drivers 
SET 
  current_lat = NULL, 
  current_lng = NULL, 
  last_location_update = NULL,
  status = 'active' -- Ensure they are active
WHERE email LIKE '%@%'; -- Reset all or specific driver

-- Re-apply the RLS policy just in case (Safety Net)
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can update their own status" ON drivers;
CREATE POLICY "Drivers can update their own status"
ON drivers FOR UPDATE
TO authenticated
USING ( user_id = auth.uid() )
WITH CHECK ( user_id = auth.uid() );

DROP POLICY IF EXISTS "Drivers can log location" ON driver_locations;
CREATE POLICY "Drivers can log location"
ON driver_locations FOR INSERT
TO authenticated
WITH CHECK ( 
  EXISTS ( SELECT 1 FROM drivers WHERE id = driver_locations.driver_id AND user_id = auth.uid() )
);
