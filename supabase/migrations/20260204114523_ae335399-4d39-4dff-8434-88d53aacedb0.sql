-- Add tenant_id to project_inspection_items for tenant-specific inspections
ALTER TABLE public.project_inspection_items
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add index for tenant lookups
CREATE INDEX idx_project_inspection_items_tenant_id ON public.project_inspection_items(tenant_id);