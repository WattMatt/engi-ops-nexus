-- Add logo columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS consultant_logo_url TEXT,
ADD COLUMN IF NOT EXISTS client_logo_url TEXT;