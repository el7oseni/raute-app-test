-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access to Profile Pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile picture" ON storage.objects;

-- Simpler RLS Policies for profiles bucket

-- Policy 1: Public read access (anyone can view)
CREATE POLICY "Public profile pictures read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');

-- Policy 2: Authenticated users can INSERT (simplified)
CREATE POLICY "Authenticated users can upload profiles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profiles');

-- Policy 3: Authenticated users can UPDATE (simplified)
CREATE POLICY "Authenticated users can update profiles"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profiles');

-- Policy 4: Authenticated users can DELETE (simplified)
CREATE POLICY "Authenticated users can delete profiles"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profiles');
