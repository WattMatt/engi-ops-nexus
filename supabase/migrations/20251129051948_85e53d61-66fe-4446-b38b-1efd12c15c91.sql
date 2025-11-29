
-- =====================================================
-- MATERIAL COST INTELLIGENCE SYSTEM - COMPLETE SCHEMA
-- =====================================================

-- 1. MATERIAL CATEGORIES (Hierarchical)
-- =====================================================
CREATE TABLE IF NOT EXISTS material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  parent_category_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_material_categories_parent ON material_categories(parent_category_id);
CREATE INDEX idx_material_categories_code ON material_categories(category_code);

-- Enable RLS
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Everyone can view, admins can modify
CREATE POLICY "Anyone can view material categories"
  ON material_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage material categories"
  ON material_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_material_categories_updated_at
  BEFORE UPDATE ON material_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. MASTER MATERIALS LIBRARY
-- =====================================================
CREATE TABLE IF NOT EXISTS master_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES material_categories(id) ON DELETE RESTRICT,
  
  -- Identification
  material_code TEXT NOT NULL UNIQUE,
  material_name TEXT NOT NULL,
  description TEXT,
  
  -- Specifications
  manufacturer TEXT,
  model_number TEXT,
  specifications JSONB DEFAULT '{}',
  
  -- Standard Pricing (company-wide baseline)
  standard_supply_cost NUMERIC(12,2) DEFAULT 0 CHECK (standard_supply_cost >= 0),
  standard_install_cost NUMERIC(12,2) DEFAULT 0 CHECK (standard_install_cost >= 0),
  unit TEXT DEFAULT 'each' CHECK (unit IN ('each', 'm', 'm²', 'kg', 'set', 'lot', 'pair')),
  
  -- Regional price modifiers (multipliers, 1.0 = base)
  gauteng_modifier NUMERIC(4,2) DEFAULT 1.00 CHECK (gauteng_modifier > 0),
  kwazulu_natal_modifier NUMERIC(4,2) DEFAULT 1.05 CHECK (kwazulu_natal_modifier > 0),
  western_cape_modifier NUMERIC(4,2) DEFAULT 1.03 CHECK (western_cape_modifier > 0),
  eastern_cape_modifier NUMERIC(4,2) DEFAULT 1.08 CHECK (eastern_cape_modifier > 0),
  limpopo_modifier NUMERIC(4,2) DEFAULT 1.10 CHECK (limpopo_modifier > 0),
  mpumalanga_modifier NUMERIC(4,2) DEFAULT 1.07 CHECK (mpumalanga_modifier > 0),
  free_state_modifier NUMERIC(4,2) DEFAULT 1.06 CHECK (free_state_modifier > 0),
  north_west_modifier NUMERIC(4,2) DEFAULT 1.09 CHECK (north_west_modifier > 0),
  northern_cape_modifier NUMERIC(4,2) DEFAULT 1.12 CHECK (northern_cape_modifier > 0),
  
  -- Metadata
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  preferred_suppliers TEXT[],
  usage_count INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_effective_dates CHECK (effective_until IS NULL OR effective_until > effective_from)
);

-- Indexes
CREATE INDEX idx_master_materials_category ON master_materials(category_id);
CREATE INDEX idx_master_materials_code ON master_materials(material_code);
CREATE INDEX idx_master_materials_active ON master_materials(is_active) WHERE is_active = true;
CREATE INDEX idx_master_materials_search ON master_materials USING gin(to_tsvector('english', material_name || ' ' || COALESCE(description, '')));

-- Enable RLS
ALTER TABLE master_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active master materials"
  ON master_materials FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage master materials"
  ON master_materials FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_master_materials_updated_at
  BEFORE UPDATE ON master_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. MATERIAL PRICE AUDIT (Automatic History)
-- =====================================================
CREATE TABLE IF NOT EXISTS material_price_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES master_materials(id) ON DELETE CASCADE,
  old_supply_cost NUMERIC(12,2),
  new_supply_cost NUMERIC(12,2),
  old_install_cost NUMERIC(12,2),
  new_install_cost NUMERIC(12,2),
  change_percent NUMERIC(5,2),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_reason TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_material_price_audit_material ON material_price_audit(material_id);
CREATE INDEX idx_material_price_audit_date ON material_price_audit(changed_at DESC);

-- Enable RLS
ALTER TABLE material_price_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Project members can view price audit"
  ON material_price_audit FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert price audit"
  ON material_price_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger function for automatic price audit
CREATE OR REPLACE FUNCTION log_material_price_change()
RETURNS TRIGGER AS $$
DECLARE
  old_total NUMERIC;
  new_total NUMERIC;
  change_pct NUMERIC;
BEGIN
  -- Only log if prices actually changed
  IF (OLD.standard_supply_cost IS DISTINCT FROM NEW.standard_supply_cost) OR 
     (OLD.standard_install_cost IS DISTINCT FROM NEW.standard_install_cost) THEN
    
    old_total := COALESCE(OLD.standard_supply_cost, 0) + COALESCE(OLD.standard_install_cost, 0);
    new_total := COALESCE(NEW.standard_supply_cost, 0) + COALESCE(NEW.standard_install_cost, 0);
    
    IF old_total > 0 THEN
      change_pct := ((new_total - old_total) / old_total) * 100;
    ELSE
      change_pct := 100;
    END IF;
    
    INSERT INTO material_price_audit (
      material_id,
      old_supply_cost,
      new_supply_cost,
      old_install_cost,
      new_install_cost,
      change_percent,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.standard_supply_cost,
      NEW.standard_supply_cost,
      OLD.standard_install_cost,
      NEW.standard_install_cost,
      change_pct,
      auth.uid(),
      COALESCE(NEW.notes, 'Price update')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_material_price_audit
  AFTER UPDATE ON master_materials
  FOR EACH ROW
  EXECUTE FUNCTION log_material_price_change();

-- 4. RETAILER CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS retailer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  typical_load_per_sqm NUMERIC(8,2),
  typical_base_rate NUMERIC(10,2),
  typical_ti_rate NUMERIC(10,2),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE retailer_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view retailer categories"
  ON retailer_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage retailer categories"
  ON retailer_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_retailer_categories_updated_at
  BEFORE UPDATE ON retailer_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. RETAILER MASTER
-- =====================================================
CREATE TABLE IF NOT EXISTS retailer_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_name TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES retailer_categories(id) ON DELETE SET NULL,
  typical_area_min NUMERIC(10,2),
  typical_area_max NUMERIC(10,2),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_retailer_master_category ON retailer_master(category_id);
CREATE INDEX idx_retailer_master_name ON retailer_master(retailer_name);

-- Enable RLS
ALTER TABLE retailer_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view retailers"
  ON retailer_master FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage retailers"
  ON retailer_master FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_retailer_master_updated_at
  BEFORE UPDATE ON retailer_master
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. MASTER RATE LIBRARY (Retailer-Specific Rates)
-- =====================================================
CREATE TABLE IF NOT EXISTS master_rate_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES retailer_master(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('base_building', 'tenant_improvement', 'equipment', 'general', 'provisional')),
  item_code TEXT,
  item_description TEXT NOT NULL,
  base_rate NUMERIC(12,2) DEFAULT 0 CHECK (base_rate >= 0),
  ti_rate NUMERIC(12,2) DEFAULT 0 CHECK (ti_rate >= 0),
  unit TEXT DEFAULT 'per_sqm' CHECK (unit IN ('per_sqm', 'each', 'lump_sum', 'per_meter', 'per_kva')),
  
  -- Regional modifiers (same as materials)
  gauteng_modifier NUMERIC(4,2) DEFAULT 1.00,
  kwazulu_natal_modifier NUMERIC(4,2) DEFAULT 1.05,
  western_cape_modifier NUMERIC(4,2) DEFAULT 1.03,
  eastern_cape_modifier NUMERIC(4,2) DEFAULT 1.08,
  limpopo_modifier NUMERIC(4,2) DEFAULT 1.10,
  mpumalanga_modifier NUMERIC(4,2) DEFAULT 1.07,
  free_state_modifier NUMERIC(4,2) DEFAULT 1.06,
  north_west_modifier NUMERIC(4,2) DEFAULT 1.09,
  northern_cape_modifier NUMERIC(4,2) DEFAULT 1.12,
  
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_current BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_master_rate_library_retailer ON master_rate_library(retailer_id);
CREATE INDEX idx_master_rate_library_type ON master_rate_library(item_type);
CREATE INDEX idx_master_rate_library_current ON master_rate_library(is_current) WHERE is_current = true;

-- Enable RLS
ALTER TABLE master_rate_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view master rates"
  ON master_rate_library FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage master rates"
  ON master_rate_library FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_master_rate_library_updated_at
  BEFORE UPDATE ON master_rate_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. RATE CHANGE AUDIT
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID NOT NULL REFERENCES master_rate_library(id) ON DELETE CASCADE,
  old_base_rate NUMERIC(12,2),
  new_base_rate NUMERIC(12,2),
  old_ti_rate NUMERIC(12,2),
  new_ti_rate NUMERIC(12,2),
  change_percent NUMERIC(5,2),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_reason TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rate_change_audit_rate ON rate_change_audit(rate_id);
CREATE INDEX idx_rate_change_audit_date ON rate_change_audit(changed_at DESC);

ALTER TABLE rate_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rate audit"
  ON rate_change_audit FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert rate audit"
  ON rate_change_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger for rate audit
CREATE OR REPLACE FUNCTION log_rate_change()
RETURNS TRIGGER AS $$
DECLARE
  old_total NUMERIC;
  new_total NUMERIC;
  change_pct NUMERIC;
BEGIN
  IF (OLD.base_rate IS DISTINCT FROM NEW.base_rate) OR 
     (OLD.ti_rate IS DISTINCT FROM NEW.ti_rate) THEN
    
    old_total := COALESCE(OLD.base_rate, 0) + COALESCE(OLD.ti_rate, 0);
    new_total := COALESCE(NEW.base_rate, 0) + COALESCE(NEW.ti_rate, 0);
    
    IF old_total > 0 THEN
      change_pct := ((new_total - old_total) / old_total) * 100;
    ELSE
      change_pct := 100;
    END IF;
    
    INSERT INTO rate_change_audit (
      rate_id, old_base_rate, new_base_rate, old_ti_rate, new_ti_rate,
      change_percent, changed_by, change_reason
    ) VALUES (
      NEW.id, OLD.base_rate, NEW.base_rate, OLD.ti_rate, NEW.ti_rate,
      change_pct, auth.uid(), COALESCE(NEW.notes, 'Rate update')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_rate_change_audit
  AFTER UPDATE ON master_rate_library
  FOR EACH ROW
  EXECUTE FUNCTION log_rate_change();

-- 8. BOQ UPLOADS (Track Uploaded Documents)
-- =====================================================
CREATE TABLE IF NOT EXISTS boq_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- File info
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('xlsx', 'xls', 'csv', 'pdf')),
  file_size INTEGER,
  
  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reviewed')),
  extraction_started_at TIMESTAMPTZ,
  extraction_completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Metadata
  source_description TEXT,
  contractor_name TEXT,
  tender_date DATE,
  province TEXT,
  building_type TEXT,
  
  -- Stats
  total_items_extracted INTEGER DEFAULT 0,
  items_matched_to_master INTEGER DEFAULT 0,
  items_added_to_master INTEGER DEFAULT 0,
  
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_boq_uploads_project ON boq_uploads(project_id);
CREATE INDEX idx_boq_uploads_status ON boq_uploads(status);
CREATE INDEX idx_boq_uploads_user ON boq_uploads(uploaded_by);

-- Enable RLS
ALTER TABLE boq_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their uploads and project uploads"
  ON boq_uploads FOR SELECT
  USING (
    uploaded_by = auth.uid() OR 
    public.has_role(auth.uid(), 'admin') OR
    (project_id IS NOT NULL AND public.user_has_project_access(project_id))
  );

CREATE POLICY "Users can upload BOQs"
  ON boq_uploads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their uploads"
  ON boq_uploads FOR UPDATE
  USING (
    uploaded_by = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete uploads"
  ON boq_uploads FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. BOQ EXTRACTED ITEMS (AI-Parsed Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS boq_extracted_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES boq_uploads(id) ON DELETE CASCADE,
  
  -- Extracted data
  row_number INTEGER,
  item_code TEXT,
  item_description TEXT NOT NULL,
  quantity NUMERIC(12,2),
  unit TEXT,
  supply_rate NUMERIC(12,2),
  install_rate NUMERIC(12,2),
  total_rate NUMERIC(12,2),
  
  -- AI categorization
  suggested_category_id UUID REFERENCES material_categories(id),
  suggested_category_name TEXT,
  matched_material_id UUID REFERENCES master_materials(id),
  match_confidence NUMERIC(3,2) CHECK (match_confidence >= 0 AND match_confidence <= 1),
  
  -- Review status
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'modified')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Actions taken
  added_to_master BOOLEAN DEFAULT false,
  added_material_id UUID REFERENCES master_materials(id),
  
  -- Raw data for reference
  raw_data JSONB,
  extraction_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_boq_extracted_items_upload ON boq_extracted_items(upload_id);
CREATE INDEX idx_boq_extracted_items_category ON boq_extracted_items(suggested_category_id);
CREATE INDEX idx_boq_extracted_items_matched ON boq_extracted_items(matched_material_id);
CREATE INDEX idx_boq_extracted_items_status ON boq_extracted_items(review_status);

-- Enable RLS
ALTER TABLE boq_extracted_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view extracted items for their uploads"
  ON boq_extracted_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boq_uploads bu 
      WHERE bu.id = boq_extracted_items.upload_id 
      AND (bu.uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "System can insert extracted items"
  ON boq_extracted_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their extracted items"
  ON boq_extracted_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boq_uploads bu 
      WHERE bu.id = boq_extracted_items.upload_id 
      AND (bu.uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 10. PROJECT MATERIALS (Project-Specific Usage)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  master_material_id UUID REFERENCES master_materials(id) ON DELETE SET NULL,
  
  -- Material details (can be custom if not from master)
  material_code TEXT,
  material_name TEXT NOT NULL,
  category_id UUID REFERENCES material_categories(id),
  description TEXT,
  
  -- Quantities
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit TEXT DEFAULT 'each',
  
  -- Pricing (actual project costs)
  supply_cost NUMERIC(12,2) DEFAULT 0 CHECK (supply_cost >= 0),
  install_cost NUMERIC(12,2) DEFAULT 0 CHECK (install_cost >= 0),
  
  -- Source tracking
  rate_source TEXT DEFAULT 'manual' CHECK (rate_source IN ('master_library', 'tender', 'quote', 'estimate', 'manual', 'boq_upload')),
  rate_overridden BOOLEAN DEFAULT false,
  override_reason TEXT,
  boq_upload_id UUID REFERENCES boq_uploads(id),
  
  -- Context
  location_in_project TEXT,
  area_served_sqm NUMERIC(10,2),
  boq_section TEXT,
  tender_reference TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_project_materials_project ON project_materials(project_id);
CREATE INDEX idx_project_materials_master ON project_materials(master_material_id);
CREATE INDEX idx_project_materials_category ON project_materials(category_id);
CREATE INDEX idx_project_materials_upload ON project_materials(boq_upload_id);

-- Enable RLS
ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view materials"
  ON project_materials FOR SELECT
  USING (public.user_has_project_access(project_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Project members can manage materials"
  ON project_materials FOR ALL
  USING (public.user_has_project_access(project_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_has_project_access(project_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_project_materials_updated_at
  BEFORE UPDATE ON project_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to increment usage count on master material
CREATE OR REPLACE FUNCTION increment_material_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.master_material_id IS NOT NULL THEN
    UPDATE master_materials 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.master_material_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_increment_material_usage
  AFTER INSERT ON project_materials
  FOR EACH ROW
  EXECUTE FUNCTION increment_material_usage();

-- 11. MATERIAL ANALYTICS SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS material_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Grouping dimensions
  category_id UUID REFERENCES material_categories(id),
  material_id UUID REFERENCES master_materials(id),
  province TEXT,
  region_type TEXT,
  building_type TEXT,
  
  -- Aggregated metrics
  total_projects INTEGER DEFAULT 0,
  total_quantity NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(14,2) DEFAULT 0,
  avg_unit_cost NUMERIC(12,2),
  min_unit_cost NUMERIC(12,2),
  max_unit_cost NUMERIC(12,2),
  stddev_unit_cost NUMERIC(12,2),
  
  -- Per-area metrics
  avg_cost_per_sqm NUMERIC(10,2),
  avg_quantity_per_sqm NUMERIC(10,4),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_material_analytics_date ON material_analytics_snapshots(snapshot_date DESC);
CREATE INDEX idx_material_analytics_category ON material_analytics_snapshots(category_id);
CREATE INDEX idx_material_analytics_province ON material_analytics_snapshots(province);
CREATE INDEX idx_material_analytics_building ON material_analytics_snapshots(building_type);

-- Enable RLS
ALTER TABLE material_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics"
  ON material_analytics_snapshots FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage analytics"
  ON material_analytics_snapshots FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. PROJECT COST BENCHMARKS
-- =====================================================
CREATE TABLE IF NOT EXISTS project_cost_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Project metrics
  total_gla NUMERIC(12,2),
  total_material_cost NUMERIC(14,2),
  
  -- Category breakdowns
  hv_equipment_cost NUMERIC(12,2) DEFAULT 0,
  lv_equipment_cost NUMERIC(12,2) DEFAULT 0,
  cable_cost NUMERIC(12,2) DEFAULT 0,
  containment_cost NUMERIC(12,2) DEFAULT 0,
  earthing_cost NUMERIC(12,2) DEFAULT 0,
  lighting_cost NUMERIC(12,2) DEFAULT 0,
  metering_cost NUMERIC(12,2) DEFAULT 0,
  other_cost NUMERIC(12,2) DEFAULT 0,
  
  -- Comparison metrics
  cost_per_sqm NUMERIC(10,2),
  cost_vs_avg_percent NUMERIC(6,2),
  benchmark_status TEXT CHECK (benchmark_status IN ('below_average', 'average', 'above_average')),
  
  -- Similar projects used for comparison
  comparison_project_ids UUID[],
  comparison_count INTEGER DEFAULT 0,
  
  calculated_at TIMESTAMPTZ DEFAULT now(),
  calculated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_project_cost_benchmarks_project ON project_cost_benchmarks(project_id);
CREATE INDEX idx_project_cost_benchmarks_status ON project_cost_benchmarks(benchmark_status);

-- Enable RLS
ALTER TABLE project_cost_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view benchmarks"
  ON project_cost_benchmarks FOR SELECT
  USING (public.user_has_project_access(project_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage benchmarks"
  ON project_cost_benchmarks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 13. ADD REGIONAL DATA TO PROJECTS
-- =====================================================
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region_type TEXT CHECK (region_type IS NULL OR region_type IN ('metro', 'urban', 'peri-urban', 'rural')),
  ADD COLUMN IF NOT EXISTS building_type TEXT CHECK (building_type IS NULL OR building_type IN ('shopping_centre', 'office', 'industrial', 'residential', 'mixed_use', 'hospital', 'school', 'warehouse')),
  ADD COLUMN IF NOT EXISTS total_gla NUMERIC(12,2);

-- 14. LINK BUDGET LINE ITEMS TO MASTER LIBRARY
-- =====================================================
ALTER TABLE budget_line_items
  ADD COLUMN IF NOT EXISTS master_rate_id UUID REFERENCES master_rate_library(id),
  ADD COLUMN IF NOT EXISTS master_material_id UUID REFERENCES master_materials(id),
  ADD COLUMN IF NOT EXISTS rate_overridden BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_reason TEXT;

-- 15. SEED MATERIAL CATEGORIES
-- =====================================================
INSERT INTO material_categories (category_code, category_name, description, sort_order) VALUES
  ('HV', 'HV Equipment', 'High Voltage equipment including RMUs, substations, switchgear', 1),
  ('LV', 'LV Equipment', 'Low Voltage distribution equipment', 2),
  ('CB', 'Cables', 'Power, control, and data cables', 3),
  ('CT', 'Containment', 'Cable trays, ladders, conduits, trunking', 4),
  ('EA', 'Earthing', 'Earthing electrodes, conductors, bonds', 5),
  ('LT', 'Lighting', 'Lighting fittings, emergency, exit signs', 6),
  ('MT', 'Metering', 'CT chambers, meters, current transformers', 7),
  ('PR', 'Protection', 'Surge protection, earth leakage, FCL', 8),
  ('AC', 'Accessories', 'Glands, lugs, terminations, connectors', 9),
  ('GN', 'General', 'General items and sundries', 10)
ON CONFLICT (category_code) DO NOTHING;

-- Add subcategories
INSERT INTO material_categories (category_code, category_name, parent_category_id, description, sort_order)
SELECT 'HV-RMU', 'Ring Main Units', id, '12kV and 24kV Ring Main Units', 1 FROM material_categories WHERE category_code = 'HV'
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO material_categories (category_code, category_name, parent_category_id, description, sort_order)
SELECT 'HV-SS', 'Miniature Substations', id, 'Packaged substations 315kVA to 2000kVA', 2 FROM material_categories WHERE category_code = 'HV'
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO material_categories (category_code, category_name, parent_category_id, description, sort_order)
SELECT 'LV-MDB', 'Main Distribution Boards', id, 'Main and sub-main distribution boards', 1 FROM material_categories WHERE category_code = 'LV'
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO material_categories (category_code, category_name, parent_category_id, description, sort_order)
SELECT 'LV-DB', 'Distribution Boards', id, 'Final distribution boards and DBs', 2 FROM material_categories WHERE category_code = 'LV'
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO material_categories (category_code, category_name, parent_category_id, description, sort_order)
SELECT 'CB-PW', 'Power Cables', id, 'LV and MV power cables', 1 FROM material_categories WHERE category_code = 'CB'
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO material_categories (category_code, category_name, parent_category_id, description, sort_order)
SELECT 'CB-CT', 'Control Cables', id, 'Control and instrumentation cables', 2 FROM material_categories WHERE category_code = 'CB'
ON CONFLICT (category_code) DO NOTHING;

-- 16. SEED RETAILER CATEGORIES
-- =====================================================
INSERT INTO retailer_categories (category_code, category_name, typical_load_per_sqm, typical_base_rate, typical_ti_rate, sort_order) VALUES
  ('ANCHOR', 'Major Anchor', 80, 350, 950, 1),
  ('MINI-ANCHOR', 'Mini Anchor', 100, 380, 1050, 2),
  ('LINE', 'Line Shop', 120, 280, 650, 3),
  ('FB', 'Food & Beverage', 180, 420, 1200, 4),
  ('ENT', 'Entertainment', 60, 280, 850, 5),
  ('BANK', 'Banking', 150, 450, 1100, 6),
  ('OFFICE', 'Office', 80, 250, 500, 7),
  ('KIOSK', 'Kiosk', 200, 350, 800, 8)
ON CONFLICT (category_code) DO NOTHING;

-- 17. SEED COMMON RETAILERS
-- =====================================================
INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Shoprite', id, 2000, 4000 FROM retailer_categories WHERE category_code = 'ANCHOR'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Pick n Pay', id, 2500, 5000 FROM retailer_categories WHERE category_code = 'ANCHOR'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Woolworths', id, 1500, 3500 FROM retailer_categories WHERE category_code = 'ANCHOR'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Checkers', id, 2000, 4500 FROM retailer_categories WHERE category_code = 'ANCHOR'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Game', id, 3000, 6000 FROM retailer_categories WHERE category_code = 'ANCHOR'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Mr Price', id, 400, 1200 FROM retailer_categories WHERE category_code = 'MINI-ANCHOR'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Clicks', id, 300, 800 FROM retailer_categories WHERE category_code = 'MINI-ANCHOR'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Dis-Chem', id, 400, 1000 FROM retailer_categories WHERE category_code = 'MINI-ANCHOR'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Generic Line Shop', id, 30, 150 FROM retailer_categories WHERE category_code = 'LINE'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'KFC', id, 80, 200 FROM retailer_categories WHERE category_code = 'FB'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'McDonalds', id, 150, 350 FROM retailer_categories WHERE category_code = 'FB'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Spur', id, 200, 400 FROM retailer_categories WHERE category_code = 'FB'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Capitec', id, 100, 250 FROM retailer_categories WHERE category_code = 'BANK'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'FNB', id, 150, 350 FROM retailer_categories WHERE category_code = 'BANK'
ON CONFLICT (retailer_name) DO NOTHING;

INSERT INTO retailer_master (retailer_name, category_id, typical_area_min, typical_area_max)
SELECT 'Standard Bank', id, 150, 350 FROM retailer_categories WHERE category_code = 'BANK'
ON CONFLICT (retailer_name) DO NOTHING;

-- 18. SEED SAMPLE MASTER MATERIALS
-- =====================================================
INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'RMU-12KV-3WAY',
  '12kV Ring Main Unit - 3 Way',
  id,
  'SF6 insulated 12kV RMU with 3 switching positions',
  185000,
  35000,
  'each',
  '{"voltage": "12kV", "positions": 3, "insulation": "SF6", "manufacturer": "ABB/Siemens"}'::jsonb
FROM material_categories WHERE category_code = 'HV-RMU'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'RMU-12KV-4WAY',
  '12kV Ring Main Unit - 4 Way',
  id,
  'SF6 insulated 12kV RMU with 4 switching positions',
  245000,
  42000,
  'each',
  '{"voltage": "12kV", "positions": 4, "insulation": "SF6", "manufacturer": "ABB/Siemens"}'::jsonb
FROM material_categories WHERE category_code = 'HV-RMU'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'SS-315KVA',
  'Miniature Substation 315kVA',
  id,
  '315kVA 11kV/400V Miniature Substation complete',
  195000,
  45000,
  'each',
  '{"rating": "315kVA", "hv_voltage": "11kV", "lv_voltage": "400V", "cooling": "ONAN"}'::jsonb
FROM material_categories WHERE category_code = 'HV-SS'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'SS-500KVA',
  'Miniature Substation 500kVA',
  id,
  '500kVA 11kV/400V Miniature Substation complete',
  285000,
  55000,
  'each',
  '{"rating": "500kVA", "hv_voltage": "11kV", "lv_voltage": "400V", "cooling": "ONAN"}'::jsonb
FROM material_categories WHERE category_code = 'HV-SS'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'SS-1000KVA',
  'Miniature Substation 1000kVA',
  id,
  '1000kVA 11kV/400V Miniature Substation complete',
  485000,
  85000,
  'each',
  '{"rating": "1000kVA", "hv_voltage": "11kV", "lv_voltage": "400V", "cooling": "ONAN"}'::jsonb
FROM material_categories WHERE category_code = 'HV-SS'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'MDB-800A',
  'Main Distribution Board 800A',
  id,
  '800A TPN Main Distribution Board with MCCB incomer',
  85000,
  25000,
  'each',
  '{"rating": "800A", "poles": "TPN", "ways": 24, "enclosure": "IP54"}'::jsonb
FROM material_categories WHERE category_code = 'LV-MDB'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'MDB-1600A',
  'Main Distribution Board 1600A',
  id,
  '1600A TPN Main Distribution Board with ACB incomer',
  165000,
  45000,
  'each',
  '{"rating": "1600A", "poles": "TPN", "ways": 36, "enclosure": "IP54"}'::jsonb
FROM material_categories WHERE category_code = 'LV-MDB'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'DB-12W-TPN',
  'Distribution Board 12 Way TPN',
  id,
  '12 Way TPN Distribution Board with 100A incomer',
  4500,
  2500,
  'each',
  '{"ways": 12, "poles": "TPN", "incomer": "100A"}'::jsonb
FROM material_categories WHERE category_code = 'LV-DB'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'DB-24W-TPN',
  'Distribution Board 24 Way TPN',
  id,
  '24 Way TPN Distribution Board with 100A incomer',
  8500,
  3500,
  'each',
  '{"ways": 24, "poles": "TPN", "incomer": "100A"}'::jsonb
FROM material_categories WHERE category_code = 'LV-DB'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'XLPE-AL-95-4C',
  'XLPE/SWA Cable 95mm² 4 Core Aluminium',
  id,
  '95mm² 4 Core Aluminium XLPE/SWA/PVC Cable',
  185,
  85,
  'm',
  '{"size": "95mm²", "cores": 4, "material": "Aluminium", "insulation": "XLPE/SWA/PVC"}'::jsonb
FROM material_categories WHERE category_code = 'CB-PW'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'XLPE-AL-185-4C',
  'XLPE/SWA Cable 185mm² 4 Core Aluminium',
  id,
  '185mm² 4 Core Aluminium XLPE/SWA/PVC Cable',
  385,
  125,
  'm',
  '{"size": "185mm²", "cores": 4, "material": "Aluminium", "insulation": "XLPE/SWA/PVC"}'::jsonb
FROM material_categories WHERE category_code = 'CB-PW'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'CT-LADDER-450',
  'Cable Ladder 450mm',
  id,
  '450mm wide galvanised cable ladder with supports',
  285,
  145,
  'm',
  '{"width": "450mm", "material": "HDG Steel", "load": "Medium Duty"}'::jsonb
FROM material_categories WHERE category_code = 'CT'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'CT-TRAY-300',
  'Cable Tray 300mm',
  id,
  '300mm wide perforated cable tray with supports',
  165,
  95,
  'm',
  '{"width": "300mm", "material": "HDG Steel", "type": "Perforated"}'::jsonb
FROM material_categories WHERE category_code = 'CT'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'EARTH-ROD-1.5M',
  'Earth Electrode 1.5m Copper Clad',
  id,
  '1.5m x 16mm Copper Clad Earth Electrode',
  450,
  350,
  'each',
  '{"length": "1.5m", "diameter": "16mm", "material": "Copper Clad Steel"}'::jsonb
FROM material_categories WHERE category_code = 'EA'
ON CONFLICT (material_code) DO NOTHING;

INSERT INTO master_materials (material_code, material_name, category_id, description, standard_supply_cost, standard_install_cost, unit, specifications)
SELECT 
  'CT-CHAMBER-3WAY',
  'CT Chamber 3 Way',
  id,
  '3 Way CT Chamber for metering installation',
  18500,
  8500,
  'each',
  '{"ways": 3, "rating": "Up to 400A per way"}'::jsonb
FROM material_categories WHERE category_code = 'MT'
ON CONFLICT (material_code) DO NOTHING;

-- Create storage bucket for BOQ uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('boq-uploads', 'boq-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for boq-uploads bucket
CREATE POLICY "Users can upload BOQ files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'boq-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their BOQ files"
ON storage.objects FOR SELECT
USING (bucket_id = 'boq-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete BOQ files"
ON storage.objects FOR DELETE
USING (bucket_id = 'boq-uploads' AND public.has_role(auth.uid(), 'admin'));
