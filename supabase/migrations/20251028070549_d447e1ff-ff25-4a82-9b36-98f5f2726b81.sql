-- Drop floor plan related tables
-- Drop child table first to avoid foreign key constraint issues
DROP TABLE IF EXISTS public.floor_plan_tasks CASCADE;
DROP TABLE IF EXISTS public.equipment_placements CASCADE;
DROP TABLE IF EXISTS public.cable_routes CASCADE;
DROP TABLE IF EXISTS public.containment_routes CASCADE;
DROP TABLE IF EXISTS public.floor_plans CASCADE;