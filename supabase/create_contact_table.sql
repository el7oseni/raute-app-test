-- ==========================================
-- CONTACT FORM SUBMISSIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company_name TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- 1. allow PUBLIC (anon) to insert ONLY
CREATE POLICY "Public can submit contact forms" ON public.contact_submissions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 2. allow ADMINS/MANAGERS to view
CREATE POLICY "Admins can view submissions" ON public.contact_submissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'company_admin', 'manager') -- Assuming managers might handle leads
        )
    );

-- 3. allow ADMINS/MANAGERS to update (mark as read)
CREATE POLICY "Admins can update submissions" ON public.contact_submissions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'company_admin', 'manager')
        )
    );

-- Grant permissions
GRANT INSERT ON public.contact_submissions TO anon;
GRANT INSERT ON public.contact_submissions TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;
