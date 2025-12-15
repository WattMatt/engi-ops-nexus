-- Add missing columns to lighting_spec_sheets
ALTER TABLE public.lighting_spec_sheets 
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS extracted_data JSONB,
ADD COLUMN IF NOT EXISTS confidence_scores JSONB,
ADD COLUMN IF NOT EXISTS extraction_error TEXT,
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add check constraint for extraction_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lighting_spec_sheets_extraction_status_check'
  ) THEN
    ALTER TABLE public.lighting_spec_sheets 
    ADD CONSTRAINT lighting_spec_sheets_extraction_status_check 
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;