-- Add beneficial occupation tracking columns to tenants table
ALTER TABLE tenants
ADD COLUMN opening_date DATE,
ADD COLUMN beneficial_occupation_days INTEGER DEFAULT 90 CHECK (beneficial_occupation_days IN (30, 45, 60, 90));