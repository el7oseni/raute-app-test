-- Check if driver7@test.com exists in the database
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    d.id as driver_id,
    d.name as driver_name,
    d.vehicle_type,
    d.vehicle_number
FROM users u
LEFT JOIN drivers d ON d.user_id = u.id
WHERE u.email = 'driver7@test.com';

-- If not found, check driver7@gmail.com
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    d.id as driver_id,
    d.name as driver_name,
    d.vehicle_type,
    d.vehicle_number
FROM users u
LEFT JOIN drivers d ON d.user_id = u.id
WHERE u.email = 'driver7@gmail.com';

-- Show all drivers
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    d.id as driver_id,
    d.name as driver_name,
    d.vehicle_type,
    d.vehicle_number
FROM users u
LEFT JOIN drivers d ON d.user_id = u.id
WHERE u.role = 'driver'
ORDER BY u.email;
