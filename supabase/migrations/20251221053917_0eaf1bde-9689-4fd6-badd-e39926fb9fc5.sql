-- Create material_rate_sources table to track rates from multiple BOQ sources
CREATE TABLE public.material_rate_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.master_materials(id) ON DELETE CASCADE,
  boq_upload_id UUID REFERENCES public.boq_uploads(id) ON DELETE SET NULL,
  boq_item_id UUID REFERENCES public.boq_extracted_items(id) ON DELETE SET NULL,
  
  -- Rate data from this source
  supply_rate NUMERIC NOT NULL DEFAULT 0,
  install_rate NUMERIC NOT NULL DEFAULT 0,
  total_rate NUMERIC GENERATED ALWAYS AS (supply_rate + install_rate) STORED,
  
  -- Source metadata (denormalized for easy analytics)
  contractor_name TEXT,
  province TEXT,
  tender_date DATE,
  project_name TEXT,
  
  -- Confidence and weighting
  confidence_score NUMERIC DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_primary_source BOOLEAN DEFAULT false,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  notes TEXT,
  
  -- Prevent duplicate entries for same material from same BOQ item
  UNIQUE(material_id, boq_item_id)
);

-- Create index for common queries
CREATE INDEX idx_material_rate_sources_material ON material_rate_sources(material_id);
CREATE INDEX idx_material_rate_sources_province ON material_rate_sources(province);
CREATE INDEX idx_material_rate_sources_contractor ON material_rate_sources(contractor_name);
CREATE INDEX idx_material_rate_sources_tender_date ON material_rate_sources(tender_date);

-- Enable RLS
ALTER TABLE public.material_rate_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view rate sources"
  ON public.material_rate_sources
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert rate sources"
  ON public.material_rate_sources
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update rate sources"
  ON public.material_rate_sources
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create a view for rate analytics
CREATE OR REPLACE VIEW public.material_rate_analytics AS
SELECT 
  m.id as material_id,
  m.material_code,
  m.material_name,
  m.standard_supply_cost,
  m.standard_install_cost,
  m.unit,
  mc.category_name,
  COUNT(mrs.id) as source_count,
  AVG(mrs.supply_rate) as avg_supply_rate,
  AVG(mrs.install_rate) as avg_install_rate,
  AVG(mrs.total_rate) as avg_total_rate,
  MIN(mrs.total_rate) as min_total_rate,
  MAX(mrs.total_rate) as max_total_rate,
  STDDEV(mrs.total_rate) as rate_stddev,
  array_agg(DISTINCT mrs.contractor_name) FILTER (WHERE mrs.contractor_name IS NOT NULL) as contractors,
  array_agg(DISTINCT mrs.province) FILTER (WHERE mrs.province IS NOT NULL) as provinces
FROM public.master_materials m
LEFT JOIN public.material_rate_sources mrs ON mrs.material_id = m.id
LEFT JOIN public.material_categories mc ON mc.id = m.category_id
WHERE m.is_active = true
GROUP BY m.id, m.material_code, m.material_name, m.standard_supply_cost, m.standard_install_cost, m.unit, mc.category_name;

-- Create a view for provincial rate comparison
CREATE OR REPLACE VIEW public.material_rate_by_province AS
SELECT 
  m.id as material_id,
  m.material_code,
  m.material_name,
  mrs.province,
  COUNT(mrs.id) as source_count,
  AVG(mrs.supply_rate) as avg_supply_rate,
  AVG(mrs.install_rate) as avg_install_rate,
  AVG(mrs.total_rate) as avg_total_rate,
  MIN(mrs.total_rate) as min_rate,
  MAX(mrs.total_rate) as max_rate
FROM public.master_materials m
JOIN public.material_rate_sources mrs ON mrs.material_id = m.id
WHERE m.is_active = true AND mrs.province IS NOT NULL
GROUP BY m.id, m.material_code, m.material_name, mrs.province;

-- Create a view for contractor rate comparison
CREATE OR REPLACE VIEW public.material_rate_by_contractor AS
SELECT 
  m.id as material_id,
  m.material_code,
  m.material_name,
  mrs.contractor_name,
  COUNT(mrs.id) as source_count,
  AVG(mrs.supply_rate) as avg_supply_rate,
  AVG(mrs.install_rate) as avg_install_rate,
  AVG(mrs.total_rate) as avg_total_rate,
  MIN(mrs.tender_date) as earliest_tender,
  MAX(mrs.tender_date) as latest_tender
FROM public.master_materials m
JOIN public.material_rate_sources mrs ON mrs.material_id = m.id
WHERE m.is_active = true AND mrs.contractor_name IS NOT NULL
GROUP BY m.id, m.material_code, m.material_name, mrs.contractor_name;

-- Function to calculate recommended rate based on sources
CREATE OR REPLACE FUNCTION public.calculate_recommended_rate(p_material_id UUID)
RETURNS TABLE(
  recommended_supply_rate NUMERIC,
  recommended_install_rate NUMERIC,
  confidence_level TEXT,
  source_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_avg_supply NUMERIC;
  v_avg_install NUMERIC;
  v_stddev NUMERIC;
  v_confidence TEXT;
BEGIN
  SELECT 
    COUNT(*),
    AVG(supply_rate),
    AVG(install_rate),
    STDDEV(total_rate)
  INTO v_count, v_avg_supply, v_avg_install, v_stddev
  FROM material_rate_sources
  WHERE material_id = p_material_id;
  
  -- Determine confidence level
  IF v_count = 0 THEN
    v_confidence := 'none';
  ELSIF v_count = 1 THEN
    v_confidence := 'low';
  ELSIF v_count <= 3 THEN
    v_confidence := 'medium';
  ELSIF v_stddev IS NOT NULL AND v_stddev < (v_avg_supply + v_avg_install) * 0.15 THEN
    v_confidence := 'high';
  ELSE
    v_confidence := 'medium';
  END IF;
  
  RETURN QUERY SELECT 
    ROUND(COALESCE(v_avg_supply, 0), 2),
    ROUND(COALESCE(v_avg_install, 0), 2),
    v_confidence,
    v_count;
END;
$$;