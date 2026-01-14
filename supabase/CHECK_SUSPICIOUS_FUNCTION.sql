-- CHECK DRIVER LIMIT FUNCTION
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'check_driver_limit';
