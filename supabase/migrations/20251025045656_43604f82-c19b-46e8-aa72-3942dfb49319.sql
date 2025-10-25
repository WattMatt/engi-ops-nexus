-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false);

-- RLS policies for employee documents bucket
-- Admins can manage all documents
CREATE POLICY "Admins can upload employee documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update employee documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete employee documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can view all documents
CREATE POLICY "Admins can view all employee documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Employees can view their own documents (folder structure: employee_id/filename)
CREATE POLICY "Employees can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' 
  AND (storage.foldername(name))[1] = (
    SELECT id::text 
    FROM employees 
    WHERE user_id = auth.uid()
  )
);