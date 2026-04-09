-- Create the storage bucket for user backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-backups', 'user-backups', false);

-- Allow authenticated users to read their own backups
CREATE POLICY "Users can read own backups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user-backups' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to upload their own backups
CREATE POLICY "Users can upload own backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-backups' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own backups
CREATE POLICY "Users can update own backups"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-backups' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own backups
CREATE POLICY "Users can delete own backups"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-backups' AND auth.uid()::text = (storage.foldername(name))[1]);