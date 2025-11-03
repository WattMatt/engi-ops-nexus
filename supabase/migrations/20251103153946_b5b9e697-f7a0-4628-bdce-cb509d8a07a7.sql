-- Create table for running recovery settings
CREATE TABLE IF NOT EXISTS public.running_recovery_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  generator_zone_id UUID REFERENCES public.generator_zones(id) ON DELETE CASCADE,
  plant_name TEXT NOT NULL DEFAULT 'STANDBY PLANT 1',
  running_load DECIMAL NOT NULL DEFAULT 75,
  net_energy_kva DECIMAL NOT NULL DEFAULT 1200,
  kva_to_kwh_conversion DECIMAL NOT NULL DEFAULT 0.95,
  fuel_consumption_rate DECIMAL NOT NULL DEFAULT 200.55,
  diesel_price_per_litre DECIMAL NOT NULL DEFAULT 23.00,
  servicing_cost_per_year DECIMAL NOT NULL DEFAULT 18800.00,
  servicing_cost_per_250_hours DECIMAL NOT NULL DEFAULT 18800.00,
  expected_hours_per_month DECIMAL NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, generator_zone_id)
);

-- Enable RLS
ALTER TABLE public.running_recovery_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view running recovery settings for their projects"
  ON public.running_recovery_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = running_recovery_settings.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert running recovery settings for their projects"
  ON public.running_recovery_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = running_recovery_settings.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update running recovery settings for their projects"
  ON public.running_recovery_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = running_recovery_settings.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete running recovery settings for their projects"
  ON public.running_recovery_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = running_recovery_settings.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_running_recovery_settings_updated_at
  BEFORE UPDATE ON public.running_recovery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();