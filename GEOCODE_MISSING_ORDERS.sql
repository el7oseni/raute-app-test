-- Utility: Add geocoding to existing orders that have addresses but no GPS coordinates
-- Run this if you have orders with addresses but missing latitude/longitude

-- ⚠️ PREREQUISITES:
-- 1. You need a valid Google Maps Geocoding API key
-- 2. The API key must be stored in your environment variables or Supabase secrets
-- 3. This script creates a temporary function to geocode addresses

-- Step 1: Check how many orders need geocoding
SELECT 
    COUNT(*) as orders_without_gps,
    COUNT(CASE WHEN driver_id IS NOT NULL THEN 1 END) as assigned_without_gps
FROM orders
WHERE address IS NOT NULL 
  AND address != ''
  AND (latitude IS NULL OR longitude IS NULL);

-- Step 2: View the orders that need geocoding
SELECT 
    id,
    order_number,
    customer_name,
    address,
    driver_id,
    status,
    created_at
FROM orders
WHERE address IS NOT NULL 
  AND address != ''
  AND (latitude IS NULL OR longitude IS NULL)
ORDER BY created_at DESC;

-- Step 3: Manual geocoding template (if you know the coordinates)
-- Replace {ORDER_ID}, {LAT}, {LNG} with actual values

/*
UPDATE orders
SET 
    latitude = {LAT},
    longitude = {LNG}
WHERE id = '{ORDER_ID}';
*/

-- Example:
-- UPDATE orders SET latitude = 30.0444, longitude = 31.2357 WHERE id = 'some-uuid-here';

-- Step 4: Bulk update for a specific address (if multiple orders have same address)
/*
UPDATE orders
SET 
    latitude = {LAT},
    longitude = {LNG}
WHERE address = 'Exact Address Here'
  AND (latitude IS NULL OR longitude IS NULL);
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ADVANCED: Server-side geocoding function (optional)
-- This requires enabling HTTP extension and storing your Google API key
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Enable HTTP extension (admin only)
-- CREATE EXTENSION IF NOT EXISTS http;

-- Example function to geocode using Google Maps API (requires setup)
/*
CREATE OR REPLACE FUNCTION geocode_address(address_text TEXT)
RETURNS TABLE(latitude FLOAT, longitude FLOAT) AS $$
DECLARE
    api_key TEXT := 'YOUR_GOOGLE_MAPS_API_KEY'; -- Store this securely!
    api_url TEXT;
    response JSON;
BEGIN
    api_url := 'https://maps.googleapis.com/maps/api/geocode/json?address=' 
        || uri_encode(address_text) 
        || '&key=' || api_key;
    
    SELECT content::json INTO response 
    FROM http_get(api_url);
    
    IF response->>'status' = 'OK' THEN
        RETURN QUERY SELECT 
            (response->'results'->0->'geometry'->'location'->>'lat')::FLOAT,
            (response->'results'->0->'geometry'->'location'->>'lng')::FLOAT;
    ELSE
        RAISE NOTICE 'Geocoding failed for: %', address_text;
        RETURN QUERY SELECT NULL::FLOAT, NULL::FLOAT;
    END IF;
END;
$$ LANGUAGE plpgsql;
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RECOMMENDATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Best practice: Add geocoding in your application code when creating orders
-- The frontend already has geocoding logic in the order creation forms
-- Make sure it's enabled and working properly
