-- Create cable_rates table
CREATE TABLE IF NOT EXISTS public.cable_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.cable_schedules(id) ON DELETE CASCADE,
  cable_type TEXT NOT NULL,
  cable_size TEXT NOT NULL,
  supply_rate_per_meter NUMERIC NOT NULL DEFAULT 0,
  install_rate_per_meter NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, cable_type, cable_size)
);

-- Enable RLS
ALTER TABLE public.cable_rates ENABLE ROW LEVEL SECURITY;

-- Create policies for cable_rates
CREATE POLICY "Users can view cable rates for their project schedules"
  ON public.cable_rates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cable_schedules cs
      JOIN public.project_members pm ON pm.project_id = cs.project_id
      WHERE cs.id = cable_rates.schedule_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cable rates for their project schedules"
  ON public.cable_rates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cable_schedules cs
      JOIN public.project_members pm ON pm.project_id = cs.project_id
      WHERE cs.id = cable_rates.schedule_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cable rates for their project schedules"
  ON public.cable_rates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.cable_schedules cs
      JOIN public.project_members pm ON pm.project_id = cs.project_id
      WHERE cs.id = cable_rates.schedule_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cable rates for their project schedules"
  ON public.cable_rates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cable_schedules cs
      JOIN public.project_members pm ON pm.project_id = cs.project_id
      WHERE cs.id = cable_rates.schedule_id
      AND pm.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_cable_rates_updated_at
  BEFORE UPDATE ON public.cable_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();