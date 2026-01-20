# Order #2 Missing GPS Coordinates - Fix Guide

## 🎯 Problem
Order #2 exists in the database but doesn't show on the map because it's missing GPS coordinates (latitude/longitude).

## 📊 Steps to Fix

### 1️⃣ **Check Order #2's Current Data**
Run this query in Supabase SQL Editor:

```sql
SELECT 
    id,
    order_number,
    customer_name,
    delivery_address,
    latitude,
    longitude,
    status
FROM orders
WHERE driver_id = (
    SELECT id FROM drivers 
    WHERE user_id = (SELECT id FROM users WHERE email = 'driver7@test.com')
)
AND order_number = 2;
```

### 2️⃣ **Option A: Manually Add GPS Coordinates**

If you know the address, you can manually add coordinates. For example, if Order #2 is in Los Angeles:

```sql
UPDATE orders
SET 
    latitude = 34.0522,  -- Replace with actual latitude
    longitude = -118.2437 -- Replace with actual longitude
WHERE order_number = 2
AND driver_id = (
    SELECT id FROM drivers 
    WHERE user_id = (SELECT id FROM users WHERE email = 'driver7@test.com')
);
```

### 2️⃣ **Option B: Use Geocoding API**

If you have the address, we can geocode it:

```sql
-- First check the address
SELECT delivery_address 
FROM orders 
WHERE order_number = 2
AND driver_id = (
    SELECT id FROM drivers 
    WHERE user_id = (SELECT id FROM users WHERE email = 'driver7@test.com')
);
```

Then use a geocoding service (Google Maps, OpenStreetMap Nominatim, etc.) to convert the address to coordinates.

### 3️⃣ **Option C: Delete Order #2 (If Test Data)**

If this is just test data and you want to remove it:

```sql
DELETE FROM orders
WHERE order_number = 2
AND driver_id = (
    SELECT id FROM drivers 
    WHERE user_id = (SELECT id FROM users WHERE email = 'driver7@test.com')
);
```

## 🔍 Verify Fix

After updating, check that Order #2 now appears on the map:

1. Go to http://localhost:3000/orders
2. Look for marker "2" on the map
3. It should be visible if GPS coordinates are valid

## 📝 Prevention

To prevent this in the future:
- Add database constraints to require GPS coordinates
- Validate addresses during order creation
- Use automatic geocoding when addresses are entered
