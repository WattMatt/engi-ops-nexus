-- Create storage bucket for lighting spec sheets (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lighting-spec-sheets', 'lighting-spec-sheets', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can upload spec sheets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view spec sheets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own spec sheets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update spec sheets" ON storage.objects;

-- Storage policies for authenticated users
CREATE POLICY "Users can upload spec sheets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'lighting-spec-sheets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view spec sheets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'lighting-spec-sheets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own spec sheets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'lighting-spec-sheets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update spec sheets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lighting-spec-sheets' AND auth.role() = 'authenticated');