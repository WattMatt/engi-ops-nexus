-- Line Shop Material Templates - stores area ranges with recommended DB size
CREATE TABLE public.line_shop_material_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  min_area NUMERIC NOT NULL DEFAULT 0,
  max_area NUMERIC NOT NULL,
  area_label TEXT NOT NULL,
  db_size TEXT,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Line Shop Template Items - materials for each area range
CREATE TABLE public.line_shop_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.line_shop_material_templates(id) ON DELETE CASCADE,
  master_material_id UUID REFERENCES public.master_materials(id) ON DELETE SET NULL,
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  supply_rate NUMERIC DEFAULT 0,
  install_rate NUMERIC DEFAULT 0,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.line_shop_material_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_shop_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Allow read access to line shop templates" 
ON public.line_shop_material_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.line_shop_material_templates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.line_shop_material_templates 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.line_shop_material_templates 
FOR DELETE 
USING (true);

-- RLS Policies for template items
CREATE POLICY "Allow read access to line shop template items" 
ON public.line_shop_template_items 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.line_shop_template_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.line_shop_template_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.line_shop_template_items 
FOR DELETE 
USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_line_shop_templates_area ON public.line_shop_material_templates(min_area, max_area);
CREATE INDEX idx_line_shop_templates_project ON public.line_shop_material_templates(project_id);
CREATE INDEX idx_line_shop_items_template ON public.line_shop_template_items(template_id);
CREATE INDEX idx_line_shop_items_material ON public.line_shop_template_items(master_material_id);

-- Trigger for updated_at
CREATE TRIGGER update_line_shop_templates_updated_at
BEFORE UPDATE ON public.line_shop_material_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();