-- Update the constraint to include draughtsman
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS valid_position;
ALTER TABLE public.project_members ADD CONSTRAINT valid_position CHECK (position IN ('primary', 'secondary', 'admin', 'oversight', 'draughtsman'));