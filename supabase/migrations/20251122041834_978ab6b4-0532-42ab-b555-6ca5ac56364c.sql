-- Add RLS policies for tenant_document_exclusions table
-- Allow project members to view exclusions for their project's tenants
CREATE POLICY "Project members can view tenant document exclusions"
ON tenant_document_exclusions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = tenant_document_exclusions.tenant_id
    AND is_project_member(auth.uid(), tenants.project_id)
  )
);

-- Allow project members to insert exclusions for their project's tenants
CREATE POLICY "Project members can insert tenant document exclusions"
ON tenant_document_exclusions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = tenant_document_exclusions.tenant_id
    AND is_project_member(auth.uid(), tenants.project_id)
  )
);

-- Allow project members to delete exclusions for their project's tenants
CREATE POLICY "Project members can delete tenant document exclusions"
ON tenant_document_exclusions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = tenant_document_exclusions.tenant_id
    AND is_project_member(auth.uid(), tenants.project_id)
  )
);