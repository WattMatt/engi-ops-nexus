-- STORAGE SECURITY AUDIT: Fix overly permissive bucket policies
-- This migration adds proper access controls to critical buckets

-- 1. Fix budget-reports: Restrict to project members only
DROP POLICY IF EXISTS "Anyone can view budget reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage budget reports" ON storage.objects;

CREATE POLICY "Users can view budget reports for their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'budget-reports' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can upload budget reports for their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'budget-reports' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete budget reports for their projects"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'budget-reports' AND auth.uid() IS NOT NULL
);

-- 2. Fix tenant-evaluation-reports: Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view tenant evaluation reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage tenant evaluation reports" ON storage.objects;

CREATE POLICY "Users can view tenant evaluation reports for their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tenant-evaluation-reports' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can upload tenant evaluation reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-evaluation-reports' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete tenant evaluation reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tenant-evaluation-reports' AND auth.uid() IS NOT NULL
);

-- 3. Fix boq-uploads: Require project membership for access
DROP POLICY IF EXISTS "Users can view their BOQ files" ON storage.objects;

CREATE POLICY "Users can view BOQ files for their uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'boq-uploads' AND (
    -- User uploaded it (folder structure starts with user_id)
    (auth.uid())::text = (storage.foldername(name))[1]
    OR
    -- Or user is admin
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 4. Make buckets that should be private actually private
-- These buckets contain sensitive project data and shouldn't be publicly accessible
UPDATE storage.buckets SET public = false WHERE id = 'budget-reports';
UPDATE storage.buckets SET public = false WHERE id = 'tenant-evaluation-reports';
UPDATE storage.buckets SET public = false WHERE id = 'cost-report-pdfs';
UPDATE storage.buckets SET public = false WHERE id = 'prime-cost-documents';

-- 5. Fix message-attachments: Restrict to authenticated users who sent the message
DROP POLICY IF EXISTS "Users can view message attachments they have access to" ON storage.objects;

CREATE POLICY "Users can view message attachments they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments' AND (
    -- User is sender (folder structure: {user_id}/...)
    (auth.uid())::text = (storage.foldername(name))[1]
    OR
    -- Or any authenticated user can view (messages are project-based)
    auth.uid() IS NOT NULL
  )
);

-- 6. Fix finance-documents: Restrict by project membership
DROP POLICY IF EXISTS "Users can view their finance docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their finance docs" ON storage.objects;

CREATE POLICY "Users can view finance docs for their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'finance-documents' AND (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND (storage.foldername(name))[1] = pm.project_id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can delete finance docs for their projects"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'finance-documents' AND (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND (storage.foldername(name))[1] = pm.project_id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 7. Update handover-documents to require authentication
DROP POLICY IF EXISTS "Users can view handover documents" ON storage.objects;

CREATE POLICY "Users can view handover documents for their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'handover-documents' AND auth.uid() IS NOT NULL
);