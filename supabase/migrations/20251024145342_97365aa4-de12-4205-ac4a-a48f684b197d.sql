-- Create electrical budgets table
CREATE TABLE public.electrical_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  budget_number TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'Rev 0',
  budget_date DATE NOT NULL,
  prepared_for_company TEXT,
  prepared_for_contact TEXT,
  prepared_for_tel TEXT,
  prepared_by_contact TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget sections table
CREATE TABLE public.budget_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL,
  section_code TEXT NOT NULL,
  section_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget line items table
CREATE TABLE public.budget_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL,
  item_number TEXT,
  description TEXT NOT NULL,
  area NUMERIC,
  area_unit TEXT DEFAULT 'm²',
  base_rate NUMERIC DEFAULT 0,
  ti_rate NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.electrical_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for electrical_budgets
CREATE POLICY "Users can view budgets for their projects"
  ON public.electrical_budgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = electrical_budgets.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create budgets for their projects"
  ON public.electrical_budgets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = electrical_budgets.project_id
      AND project_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update budgets for their projects"
  ON public.electrical_budgets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = electrical_budgets.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budgets for their projects"
  ON public.electrical_budgets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = electrical_budgets.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- RLS policies for budget_sections
CREATE POLICY "Users can view sections in their budgets"
  ON public.budget_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM electrical_budgets eb
      JOIN project_members pm ON pm.project_id = eb.project_id
      WHERE eb.id = budget_sections.budget_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage sections in their budgets"
  ON public.budget_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM electrical_budgets eb
      JOIN project_members pm ON pm.project_id = eb.project_id
      WHERE eb.id = budget_sections.budget_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS policies for budget_line_items
CREATE POLICY "Users can view line items in their budgets"
  ON public.budget_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_sections bs
      JOIN electrical_budgets eb ON eb.id = bs.budget_id
      JOIN project_members pm ON pm.project_id = eb.project_id
      WHERE bs.id = budget_line_items.section_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage line items in their budgets"
  ON public.budget_line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM budget_sections bs
      JOIN electrical_budgets eb ON eb.id = bs.budget_id
      JOIN project_members pm ON pm.project_id = eb.project_id
      WHERE bs.id = budget_line_items.section_id
      AND pm.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_electrical_budgets_updated_at
  BEFORE UPDATE ON public.electrical_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_sections_updated_at
  BEFORE UPDATE ON public.budget_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_line_items_updated_at
  BEFORE UPDATE ON public.budget_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();