
-- Global Planner sync settings (single-row singleton pattern)
CREATE TABLE public.planner_sync_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'planner_to_nexus', 'nexus_to_planner')),
  sync_frequency_minutes INTEGER NOT NULL DEFAULT 60 CHECK (sync_frequency_minutes >= 1),
  push_frequency_minutes INTEGER NOT NULL DEFAULT 3 CHECK (push_frequency_minutes >= 1),
  handle_recurring_tasks TEXT NOT NULL DEFAULT 'skip' CHECK (handle_recurring_tasks IN ('skip', 'process')),
  last_modified_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planner_sync_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins can view planner settings"
  ON public.planner_sync_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update planner settings"
  ON public.planner_sync_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert (for initial seed)
CREATE POLICY "Admins can insert planner settings"
  ON public.planner_sync_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-update timestamp
CREATE TRIGGER update_planner_sync_settings_updated_at
  BEFORE UPDATE ON public.planner_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the default row
INSERT INTO public.planner_sync_settings (enabled, sync_direction, sync_frequency_minutes, push_frequency_minutes, handle_recurring_tasks)
VALUES (false, 'bidirectional', 60, 3, 'skip');
