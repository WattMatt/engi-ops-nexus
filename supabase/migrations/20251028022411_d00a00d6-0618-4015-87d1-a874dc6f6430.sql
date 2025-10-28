-- Add thumbnail_url column to floor_plans table
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;