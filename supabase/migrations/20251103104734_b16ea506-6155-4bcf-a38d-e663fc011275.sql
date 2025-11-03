-- Add quantity column to cable_entries table
ALTER TABLE cable_entries 
ADD COLUMN quantity integer NOT NULL DEFAULT 1;