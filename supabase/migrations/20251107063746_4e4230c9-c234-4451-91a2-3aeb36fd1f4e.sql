-- Fix foreign key constraint for tenant_change_audit_log to allow CASCADE delete
-- This will automatically delete audit log entries when a tenant is deleted

-- First, drop the existing foreign key constraint
ALTER TABLE tenant_change_audit_log 
DROP CONSTRAINT IF EXISTS tenant_change_audit_log_tenant_id_fkey;

-- Recreate it with CASCADE delete
ALTER TABLE tenant_change_audit_log
ADD CONSTRAINT tenant_change_audit_log_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;