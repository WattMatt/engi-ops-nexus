
-- Create public storage bucket for project assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anon SELECT on project-assets bucket
CREATE POLICY "Allow anon select on project-assets"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'project-assets');

-- Allow anon INSERT on project-assets bucket
CREATE POLICY "Allow anon insert on project-assets"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'project-assets');

-- Allow anon UPDATE on project-assets bucket
CREATE POLICY "Allow anon update on project-assets"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'project-assets')
WITH CHECK (bucket_id = 'project-assets');
