-- Add tenant linkage and location grouping to procurement items
ALTER TABLE project_procurement_items 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS location_group TEXT DEFAULT 'general';

-- Add comment for clarity
COMMENT ON COLUMN project_procurement_items.location_group IS 'Grouping: general, tenant, back_of_house, front_of_house';
COMMENT ON COLUMN project_procurement_items.tenant_id IS 'Optional link to tenant for tenant-specific procurement items';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_procurement_items_location_group ON project_procurement_items(location_group);
CREATE INDEX IF NOT EXISTS idx_procurement_items_tenant ON project_procurement_items(tenant_id);