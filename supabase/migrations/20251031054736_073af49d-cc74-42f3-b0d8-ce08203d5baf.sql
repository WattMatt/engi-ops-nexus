-- Add scale_info column to project_floor_plans table to store scale information
ALTER TABLE public.project_floor_plans 
ADD COLUMN scale_info JSONB;