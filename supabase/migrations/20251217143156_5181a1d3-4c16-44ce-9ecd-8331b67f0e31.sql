-- Create lighting_zones table for defining project-specific lighting zones
CREATE TABLE public.lighting_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  zone_type TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  min_lux INTEGER,
  max_wattage_per_m2 NUMERIC(10,2),
  color_temperature_min INTEGER,
  color_temperature_max INTEGER,
  area_m2 NUMERIC(10,2),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lighting_zones ENABLE ROW LEVEL SECURITY;

-- Create policies for lighting_zones
CREATE POLICY "Users can view all lighting zones" 
ON public.lighting_zones 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create lighting zones" 
ON public.lighting_zones 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update lighting zones" 
ON public.lighting_zones 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete lighting zones" 
ON public.lighting_zones 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lighting_zones_updated_at
BEFORE UPDATE ON public.lighting_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();