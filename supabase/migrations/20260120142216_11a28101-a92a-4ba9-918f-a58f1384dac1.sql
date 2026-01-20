-- =====================================================
-- BULK SERVICES WORKFLOW: Utility Power Application Process
-- =====================================================
-- This creates a comprehensive workflow tracking system for 
-- obtaining electrical power from a utility

-- Main workflow phases table
CREATE TABLE IF NOT EXISTS public.bulk_services_workflow_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.bulk_services_documents(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  phase_description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, phase_number)
);

-- Workflow tasks within each phase (sub-items)
CREATE TABLE IF NOT EXISTS public.bulk_services_workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.bulk_services_workflow_phases(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  task_description TEXT,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  linked_data JSONB DEFAULT '{}'::jsonb, -- For auto-populated data from document
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workflow progress snapshots for reporting
CREATE TABLE IF NOT EXISTS public.bulk_services_workflow_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.bulk_services_documents(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_phases INTEGER NOT NULL,
  completed_phases INTEGER NOT NULL DEFAULT 0,
  total_tasks INTEGER NOT NULL,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  critical_tasks_pending INTEGER NOT NULL DEFAULT 0,
  phase_status JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulk_services_workflow_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_services_workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_services_workflow_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_phases
CREATE POLICY "Users can view workflow phases for their projects"
  ON public.bulk_services_workflow_phases
  FOR SELECT
  USING (
    document_id IN (
      SELECT bd.id FROM public.bulk_services_documents bd
      JOIN public.project_members pm ON bd.project_id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workflow phases for their projects"
  ON public.bulk_services_workflow_phases
  FOR ALL
  USING (
    document_id IN (
      SELECT bd.id FROM public.bulk_services_documents bd
      JOIN public.project_members pm ON bd.project_id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- RLS Policies for workflow_tasks
CREATE POLICY "Users can view workflow tasks for their projects"
  ON public.bulk_services_workflow_tasks
  FOR SELECT
  USING (
    phase_id IN (
      SELECT wp.id FROM public.bulk_services_workflow_phases wp
      JOIN public.bulk_services_documents bd ON wp.document_id = bd.id
      JOIN public.project_members pm ON bd.project_id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workflow tasks for their projects"
  ON public.bulk_services_workflow_tasks
  FOR ALL
  USING (
    phase_id IN (
      SELECT wp.id FROM public.bulk_services_workflow_phases wp
      JOIN public.bulk_services_documents bd ON wp.document_id = bd.id
      JOIN public.project_members pm ON bd.project_id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- RLS Policies for workflow_snapshots
CREATE POLICY "Users can view workflow snapshots for their projects"
  ON public.bulk_services_workflow_snapshots
  FOR SELECT
  USING (
    document_id IN (
      SELECT bd.id FROM public.bulk_services_documents bd
      JOIN public.project_members pm ON bd.project_id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workflow snapshots for their projects"
  ON public.bulk_services_workflow_snapshots
  FOR ALL
  USING (
    document_id IN (
      SELECT bd.id FROM public.bulk_services_documents bd
      JOIN public.project_members pm ON bd.project_id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_workflow_phases_document_id ON public.bulk_services_workflow_phases(document_id);
CREATE INDEX idx_workflow_tasks_phase_id ON public.bulk_services_workflow_tasks(phase_id);
CREATE INDEX idx_workflow_tasks_is_critical ON public.bulk_services_workflow_tasks(is_critical) WHERE is_critical = true;
CREATE INDEX idx_workflow_snapshots_document_id ON public.bulk_services_workflow_snapshots(document_id);

-- Trigger for updated_at
CREATE TRIGGER update_workflow_phases_updated_at
  BEFORE UPDATE ON public.bulk_services_workflow_phases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_tasks_updated_at
  BEFORE UPDATE ON public.bulk_services_workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();