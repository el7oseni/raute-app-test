-- ============================================
-- CHECK IF LOCATION DATA IS IN DATABASE
-- ============================================
-- Run this query to see if coordinates are actually being saved

SELECT 
    id,
    name,
    user_id,
    company_id,
    current_lat,
    current_lng,
    last_location_update,
    is_online,
    idle_since,
    battery_level,
    created_at
FROM drivers
WHERE is_online = true
ORDER BY last_location_update DESC NULLS LAST;
