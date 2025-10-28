-- Create table for storing import sessions
CREATE TABLE public.import_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_url TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  selected_files JSONB NOT NULL,
  files_content JSONB NOT NULL,
  dependencies JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create import sessions
CREATE POLICY "Anyone can create import sessions"
ON public.import_sessions
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read import sessions
CREATE POLICY "Anyone can view import sessions"
ON public.import_sessions
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_import_sessions_created_at ON public.import_sessions(created_at DESC);