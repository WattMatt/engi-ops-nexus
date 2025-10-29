-- Remove the restrictive check constraint on floor_plan_cables.cable_type
-- This allows users to save designs with any cable type value
ALTER TABLE floor_plan_cables 
DROP CONSTRAINT IF EXISTS floor_plan_cables_cable_type_check;