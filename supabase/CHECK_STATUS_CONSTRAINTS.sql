-- Check constraints on drivers table
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.drivers'::regclass;

-- Check column default and constraints
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'drivers' AND column_name = 'status';

-- Try direct update to active
UPDATE public.drivers
SET status = 'active'
WHERE email = 'driver11@gmail.com'
RETURNING id, name, email, status;
