-- Create profiles storage bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for profiles bucket

-- Policy 1: Anyone can view profile pictures (public read)
CREATE POLICY "Public Access to Profile Pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');

-- Policy 2: Users can upload their own profile pictures
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (SELECT split_part(storage.filename(name), '-', 1))
);

-- Policy 3: Users can UPDATE their own profile pictures
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (SELECT split_part(storage.filename(name), '-', 1))
);

-- Policy 4: Users can DELETE their own profile pictures
CREATE POLICY "Users can delete own profile picture"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (SELECT split_part(storage.filename(name), '-', 1))
);
