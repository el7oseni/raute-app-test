-- Create proof_images table for storing multiple delivery proof photos per order
-- This allows drivers to upload multiple photos instead of just one

CREATE TABLE IF NOT EXISTS proof_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_proof_images_order_id ON proof_images(order_id);
CREATE INDEX IF NOT EXISTS idx_proof_images_company_id ON proof_images(company_id);

-- Enable RLS (Row Level Security)
ALTER TABLE proof_images ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view proof images for orders in their company
CREATE POLICY "Users can view proof images in their company"
    ON proof_images
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert proof images for orders in their company
CREATE POLICY "Users can upload proof images for their company orders"
    ON proof_images
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete proof images for orders in their company
CREATE POLICY "Users can delete proof images in their company"
    ON proof_images
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Add comment for documentation
COMMENT ON TABLE proof_images IS 'Stores multiple proof of delivery images per order';
COMMENT ON COLUMN proof_images.order_id IS 'Reference to the order this proof image belongs to';
COMMENT ON COLUMN proof_images.image_url IS 'Public URL of the uploaded image in Supabase storage';
COMMENT ON COLUMN proof_images.uploaded_by IS 'User ID who uploaded this image';
