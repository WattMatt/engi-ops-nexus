-- Add installation_method column to cable_entries table
ALTER TABLE cable_entries 
ADD COLUMN installation_method text NOT NULL DEFAULT 'air';

-- Add a check constraint to ensure valid values
ALTER TABLE cable_entries
ADD CONSTRAINT cable_entries_installation_method_check 
CHECK (installation_method IN ('air', 'ducts', 'ground'));