
-- Add dropbox_path column to project_drawings for direct Dropbox linking
ALTER TABLE public.project_drawings 
ADD COLUMN IF NOT EXISTS dropbox_path TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.project_drawings.dropbox_path IS 'Dropbox file path for direct access (used instead of Supabase storage)';
