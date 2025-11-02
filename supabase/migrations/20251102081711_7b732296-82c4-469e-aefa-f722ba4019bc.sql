-- Add notes column to tenant_tracker_reports table
ALTER TABLE public.tenant_tracker_reports
ADD COLUMN IF NOT EXISTS notes text;