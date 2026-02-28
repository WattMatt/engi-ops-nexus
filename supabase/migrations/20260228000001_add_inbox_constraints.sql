-- Improve schema for duplicate prevention
-- Add an explicit column for the external ID to allow easy unique constraints and upserts

ALTER TABLE ops_unified_inbox 
ADD COLUMN IF NOT EXISTS external_ref_id TEXT;

-- Create a composite unique constraint: Source + External ID must be unique
-- This prevents the same Reminder (or Planner task) from being ingested twice
ALTER TABLE ops_unified_inbox
ADD CONSTRAINT uq_ops_inbox_source_ref UNIQUE (source, external_ref_id);

-- Create an index for lookups
CREATE INDEX IF NOT EXISTS idx_ops_inbox_external_ref ON ops_unified_inbox(external_ref_id);
