CREATE OR REPLACE FUNCTION public.get_company_dispatchers(company_id_param UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(u)
    FROM public.users u
    WHERE u.company_id = company_id_param
    AND u.role = 'dispatcher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
