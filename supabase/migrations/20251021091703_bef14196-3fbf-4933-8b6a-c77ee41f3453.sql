-- Create cost reports table
CREATE TABLE public.cost_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_number INTEGER NOT NULL,
  report_date DATE NOT NULL,
  project_number TEXT NOT NULL,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  site_handover_date DATE,
  practical_completion_date DATE,
  electrical_contractor TEXT,
  earthing_contractor TEXT,
  standby_plants_contractor TEXT,
  cctv_contractor TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(project_id, report_number)
);

-- Create cost categories table
CREATE TABLE public.cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_report_id UUID NOT NULL REFERENCES public.cost_reports(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  original_budget NUMERIC(15,2) NOT NULL DEFAULT 0,
  previous_report NUMERIC(15,2) NOT NULL DEFAULT 0,
  anticipated_final NUMERIC(15,2) NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cost line items table
CREATE TABLE public.cost_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.cost_categories(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  original_budget NUMERIC(15,2) NOT NULL DEFAULT 0,
  previous_report NUMERIC(15,2) NOT NULL DEFAULT 0,
  anticipated_final NUMERIC(15,2) NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create variations table (linked to tenants)
CREATE TABLE public.cost_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_report_id UUID NOT NULL REFERENCES public.cost_reports(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  is_credit BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cost_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_variations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cost_reports
CREATE POLICY "Users can view cost reports for their projects"
  ON public.cost_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = cost_reports.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cost reports for their projects"
  ON public.cost_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = cost_reports.project_id
      AND project_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update cost reports for their projects"
  ON public.cost_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = cost_reports.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cost reports for their projects"
  ON public.cost_reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = cost_reports.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- RLS Policies for cost_categories
CREATE POLICY "Users can view categories in their cost reports"
  ON public.cost_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cost_reports cr
      JOIN public.project_members pm ON pm.project_id = cr.project_id
      WHERE cr.id = cost_categories.cost_report_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage categories in their cost reports"
  ON public.cost_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cost_reports cr
      JOIN public.project_members pm ON pm.project_id = cr.project_id
      WHERE cr.id = cost_categories.cost_report_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS Policies for cost_line_items
CREATE POLICY "Users can view line items in their cost reports"
  ON public.cost_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cost_categories cc
      JOIN public.cost_reports cr ON cr.id = cc.cost_report_id
      JOIN public.project_members pm ON pm.project_id = cr.project_id
      WHERE cc.id = cost_line_items.category_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage line items in their cost reports"
  ON public.cost_line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cost_categories cc
      JOIN public.cost_reports cr ON cr.id = cc.cost_report_id
      JOIN public.project_members pm ON pm.project_id = cr.project_id
      WHERE cc.id = cost_line_items.category_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS Policies for cost_variations
CREATE POLICY "Users can view variations in their cost reports"
  ON public.cost_variations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cost_reports cr
      JOIN public.project_members pm ON pm.project_id = cr.project_id
      WHERE cr.id = cost_variations.cost_report_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage variations in their cost reports"
  ON public.cost_variations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cost_reports cr
      JOIN public.project_members pm ON pm.project_id = cr.project_id
      WHERE cr.id = cost_variations.cost_report_id
      AND pm.user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_cost_reports_updated_at
  BEFORE UPDATE ON public.cost_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_categories_updated_at
  BEFORE UPDATE ON public.cost_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_line_items_updated_at
  BEFORE UPDATE ON public.cost_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_variations_updated_at
  BEFORE UPDATE ON public.cost_variations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();