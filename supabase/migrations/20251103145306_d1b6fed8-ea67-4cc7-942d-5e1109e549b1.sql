-- Add generator size and cost columns to generator_zones table
ALTER TABLE public.generator_zones
ADD COLUMN generator_size text,
ADD COLUMN generator_cost numeric DEFAULT 0,
ADD COLUMN notes text;