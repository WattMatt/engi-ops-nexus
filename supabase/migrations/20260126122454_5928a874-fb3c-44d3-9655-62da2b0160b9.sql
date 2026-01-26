-- ============================================================================
-- Drawing Management System - Database Schema
-- Phase 1: Core tables, categories, and RLS policies
-- ============================================================================

-- 1. Drawing Categories (Reference Data)
CREATE TABLE public.drawing_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_tenant_specific BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pre-populate categories based on electrical engineering conventions
INSERT INTO public.drawing_categories (code, name, icon, sort_order, is_tenant_specific) VALUES
('site', 'Site Plans', 'map', 1, false),
('power', 'Power Layouts', 'zap', 2, false),
('lighting', 'Lighting Layouts', 'lightbulb', 3, false),
('schematic', 'Schematic Distribution Diagrams', 'git-branch', 4, false),
('cctv', 'CCTV & Security', 'camera', 5, false),
('hvac', 'HVAC Layouts', 'wind', 6, false),
('signage', 'Signage Layouts', 'type', 7, false),
('details', 'Detail Drawings', 'layers', 8, false),
('tenant', 'Tenant Drawings', 'store', 9, true);

-- 2. Project Drawings (Main Table)
CREATE TABLE public.project_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Drawing Identification
  drawing_number TEXT NOT NULL,
  drawing_title TEXT NOT NULL,
  
  -- Categorisation
  category TEXT NOT NULL,
  subcategory TEXT,
  
  -- Tenant Association
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  shop_number TEXT,
  
  -- File Information
  file_url TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  
  -- Revision Control
  current_revision TEXT DEFAULT 'A',
  revision_date DATE,
  revision_notes TEXT,
  
  -- Status Tracking
  status TEXT DEFAULT 'draft',
  issue_date DATE,
  
  -- Portal Visibility
  visible_to_client BOOLEAN DEFAULT false,
  visible_to_contractor BOOLEAN DEFAULT true,
  included_in_handover BOOLEAN DEFAULT false,
  
  -- Roadmap Integration
  roadmap_item_id UUID REFERENCES public.project_roadmap_items(id) ON DELETE SET NULL,
  
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint per project
  UNIQUE(project_id, drawing_number)
);

-- 3. Drawing Revisions (Version History)
CREATE TABLE public.drawing_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES public.project_drawings(id) ON DELETE CASCADE,
  
  revision TEXT NOT NULL,
  revision_date DATE NOT NULL,
  revision_notes TEXT,
  
  file_url TEXT,
  file_path TEXT,
  file_size INTEGER,
  
  revised_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Indexes for Performance
CREATE INDEX idx_project_drawings_project ON public.project_drawings(project_id);
CREATE INDEX idx_project_drawings_category ON public.project_drawings(category);
CREATE INDEX idx_project_drawings_tenant ON public.project_drawings(tenant_id);
CREATE INDEX idx_project_drawings_status ON public.project_drawings(status);
CREATE INDEX idx_project_drawings_number ON public.project_drawings(drawing_number);
CREATE INDEX idx_drawing_revisions_drawing ON public.drawing_revisions(drawing_id);

-- 5. Enable RLS
ALTER TABLE public.drawing_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_revisions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Drawing categories are readable by all authenticated users
CREATE POLICY "Drawing categories are viewable by authenticated users"
ON public.drawing_categories FOR SELECT
TO authenticated
USING (true);

-- Project drawings - authenticated users with project access
CREATE POLICY "Users can view drawings for their projects"
ON public.project_drawings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_drawings.project_id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_drawings.project_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can insert drawings for their projects"
ON public.project_drawings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_drawings.project_id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_drawings.project_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update drawings for their projects"
ON public.project_drawings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_drawings.project_id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_drawings.project_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete drawings for their projects"
ON public.project_drawings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_drawings.project_id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_drawings.project_id
    AND p.created_by = auth.uid()
  )
);

-- Drawing revisions follow parent drawing access
CREATE POLICY "Users can view revisions for accessible drawings"
ON public.drawing_revisions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_drawings pd
    JOIN public.project_members pm ON pm.project_id = pd.project_id
    WHERE pd.id = drawing_revisions.drawing_id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.project_drawings pd
    JOIN public.projects p ON p.id = pd.project_id
    WHERE pd.id = drawing_revisions.drawing_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can insert revisions for accessible drawings"
ON public.drawing_revisions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_drawings pd
    JOIN public.project_members pm ON pm.project_id = pd.project_id
    WHERE pd.id = drawing_revisions.drawing_id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.project_drawings pd
    JOIN public.projects p ON p.id = pd.project_id
    WHERE pd.id = drawing_revisions.drawing_id
    AND p.created_by = auth.uid()
  )
);

-- 7. Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_project_drawings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_drawings_timestamp
BEFORE UPDATE ON public.project_drawings
FOR EACH ROW
EXECUTE FUNCTION public.update_project_drawings_updated_at();

-- 8. Function to auto-detect drawing category from number
CREATE OR REPLACE FUNCTION public.detect_drawing_category(drawing_number TEXT)
RETURNS TEXT AS $$
DECLARE
  parts TEXT[];
  num_part TEXT;
  num INTEGER;
BEGIN
  -- Split by '/' and get the third part (the number)
  parts := string_to_array(drawing_number, '/');
  
  IF array_length(parts, 1) < 3 THEN
    RETURN 'other';
  END IF;
  
  num_part := parts[3];
  
  -- Handle tenant drawings (4XX with letters like 4CM, 4PA)
  IF num_part ~ '^4[A-Za-z]' THEN
    RETURN 'tenant';
  END IF;
  
  -- Extract numeric portion
  num := COALESCE(NULLIF(regexp_replace(num_part, '[^0-9]', '', 'g'), '')::INTEGER, 0);
  
  -- Categorise based on number ranges
  IF num >= 1 AND num < 100 THEN
    RETURN 'site';
  ELSIF num >= 100 AND num < 200 THEN
    RETURN 'power';
  ELSIF num >= 200 AND num < 300 THEN
    RETURN 'lighting';
  ELSIF num >= 300 AND num < 400 THEN
    RETURN 'schematic';
  ELSIF num >= 400 AND num < 500 THEN
    RETURN 'tenant';
  ELSIF num >= 600 AND num < 700 THEN
    RETURN 'cctv';
  ELSIF num >= 700 AND num < 800 THEN
    RETURN 'hvac';
  ELSIF num >= 800 AND num < 900 THEN
    RETURN 'signage';
  ELSE
    RETURN 'other';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Handover sync trigger (creates handover document when included_in_handover is set)
CREATE OR REPLACE FUNCTION public.sync_drawing_to_handover()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when included_in_handover changes from false/null to true
  IF NEW.included_in_handover = true AND (OLD.included_in_handover IS NULL OR OLD.included_in_handover = false) THEN
    -- Check if handover document already exists for this drawing
    IF NOT EXISTS (
      SELECT 1 FROM public.handover_documents 
      WHERE source_type = 'drawing' AND source_id = NEW.id
    ) THEN
      INSERT INTO public.handover_documents (
        project_id, 
        document_name, 
        document_type, 
        file_url,
        file_path,
        source_type, 
        source_id, 
        notes,
        created_by
      ) VALUES (
        NEW.project_id,
        NEW.drawing_number || ' - ' || NEW.drawing_title,
        CASE NEW.category 
          WHEN 'power' THEN 'as_built_drawing'
          WHEN 'lighting' THEN 'as_built_drawing'
          WHEN 'schematic' THEN 'as_built_drawing'
          ELSE 'electrical_drawings'
        END,
        NEW.file_url,
        NEW.file_path,
        'drawing',
        NEW.id,
        'Rev ' || COALESCE(NEW.current_revision, 'A'),
        NEW.created_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_drawing_to_handover_trigger
AFTER UPDATE ON public.project_drawings
FOR EACH ROW
EXECUTE FUNCTION public.sync_drawing_to_handover();