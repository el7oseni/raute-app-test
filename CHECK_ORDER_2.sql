
-- Check exact details for Order #2 (searching by route_index or order_number)
SELECT 
    id, 
    order_number, 
    route_index, 
    status, 
    latitude, 
    longitude, 
    customer_name
FROM orders 
WHERE 
    driver_id = (SELECT id FROM drivers WHERE user_id = 'b8b8e732-aeb4-43c1-a29b-af2e2e13035c')
    AND (route_index = 2 OR order_number = 'ORD-002');
