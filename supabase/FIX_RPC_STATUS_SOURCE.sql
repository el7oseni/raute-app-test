-- Fix the get_company_drivers RPC to read status from drivers table
CREATE OR REPLACE FUNCTION public.get_company_drivers(company_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_agg(
            json_build_object(
                'id', d.id,
                'user_id', d.user_id,
                'name', u.full_name,
                'email', u.email,
                'phone', u.phone,
                'vehicle_type', d.vehicle_type,
                'status', d.status,  -- ✅ FIXED: Read from drivers.status instead of users.status
                'is_active', d.is_active,  -- ✅ NEW: Added activation status
                'notes', d.notes,
                'custom_data', d.custom_data,
                'default_start_address', d.default_start_address,
                'default_start_lat', d.default_start_lat,
                'default_start_lng', d.default_start_lng
            )
        )
        FROM public.drivers d
        JOIN public.users u ON d.user_id = u.id
        WHERE d.company_id = company_id_param
    );
END;
$$;
