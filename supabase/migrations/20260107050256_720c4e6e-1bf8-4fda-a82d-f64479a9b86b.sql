-- Add logo_url column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS logo_url TEXT;