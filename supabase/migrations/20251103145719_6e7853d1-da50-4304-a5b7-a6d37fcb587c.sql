-- Add number of generators column to generator_zones table
ALTER TABLE public.generator_zones
ADD COLUMN num_generators integer DEFAULT 1 CHECK (num_generators >= 1 AND num_generators <= 3);