-- Add scale line coordinate columns to project_floor_plans table
ALTER TABLE public.project_floor_plans
ADD COLUMN IF NOT EXISTS scale_line_start jsonb,
ADD COLUMN IF NOT EXISTS scale_line_end jsonb;