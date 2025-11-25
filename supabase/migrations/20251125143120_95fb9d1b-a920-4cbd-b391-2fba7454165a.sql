-- Add column to store the original total count when cables were split
ALTER TABLE cable_entries 
ADD COLUMN IF NOT EXISTS parallel_total_count integer;