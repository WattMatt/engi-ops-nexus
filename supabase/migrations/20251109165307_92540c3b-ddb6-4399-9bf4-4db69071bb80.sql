-- Create table for tutorial progress
CREATE TABLE IF NOT EXISTS public.bulk_services_tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES bulk_services_documents(id) ON DELETE CASCADE,
  calculation_type TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, document_id, calculation_type)
);

-- Enable RLS
ALTER TABLE public.bulk_services_tutorial_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tutorial progress
CREATE POLICY "Users can view own tutorial progress"
  ON public.bulk_services_tutorial_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tutorial progress
CREATE POLICY "Users can insert own tutorial progress"
  ON public.bulk_services_tutorial_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tutorial progress
CREATE POLICY "Users can update own tutorial progress"
  ON public.bulk_services_tutorial_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own tutorial progress
CREATE POLICY "Users can delete own tutorial progress"
  ON public.bulk_services_tutorial_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_bulk_services_tutorial_progress_updated_at
  BEFORE UPDATE ON public.bulk_services_tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();