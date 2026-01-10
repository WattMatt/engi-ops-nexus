-- Create procurement_items table for tracking orders across all sources
CREATE TABLE public.procurement_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Item details
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'No.',
  
  -- Source linking (where this item came from)
  source_type TEXT NOT NULL CHECK (source_type IN ('prime_cost', 'boq', 'tenant_tracker', 'manual')),
  source_id UUID, -- References the source item (final_account_items.id, boq_items.id, tenants.id, or null for manual)
  source_reference TEXT, -- Human-readable reference (e.g., "Bill 1 - PC Item A1")
  
  -- Supplier info
  supplier_name TEXT,
  supplier_contact TEXT,
  supplier_email TEXT,
  supplier_phone TEXT,
  
  -- Cost tracking
  estimated_cost NUMERIC DEFAULT 0,
  quoted_amount NUMERIC,
  approved_budget NUMERIC,
  actual_cost NUMERIC,
  
  -- PO and ordering details
  po_number TEXT,
  lead_time_days INTEGER,
  
  -- Key dates
  quote_requested_at TIMESTAMPTZ,
  quote_received_at TIMESTAMPTZ,
  approval_requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  ordered_at TIMESTAMPTZ,
  expected_delivery_date DATE,
  delivered_at TIMESTAMPTZ,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending_quote' CHECK (status IN (
    'pending_quote', 'quote_received', 'pending_approval', 
    'approved', 'ordered', 'in_transit', 'delivered', 'cancelled'
  )),
  
  -- Approval workflow
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approval_notes TEXT,
  budget_check_passed BOOLEAN,
  budget_variance NUMERIC, -- Difference between quoted and estimated
  
  -- Priority and categorization
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT, -- e.g., 'DBs', 'Lighting', 'Cables', 'Equipment'
  
  -- Roadmap integration - link to roadmap item for visibility
  roadmap_item_id UUID REFERENCES public.project_roadmap_items(id) ON DELETE SET NULL,
  
  -- Notes and documents
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for fast lookups
CREATE INDEX idx_procurement_items_project ON public.procurement_items(project_id);
CREATE INDEX idx_procurement_items_status ON public.procurement_items(status);
CREATE INDEX idx_procurement_items_source ON public.procurement_items(source_type, source_id);
CREATE INDEX idx_procurement_items_roadmap ON public.procurement_items(roadmap_item_id);

-- Enable RLS
ALTER TABLE public.procurement_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view procurement items for their projects"
  ON public.procurement_items FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can create procurement items for their projects"
  ON public.procurement_items FOR INSERT
  WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update procurement items for their projects"
  ON public.procurement_items FOR UPDATE
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can delete procurement items for their projects"
  ON public.procurement_items FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id));

-- Trigger for updated_at
CREATE TRIGGER update_procurement_items_updated_at
  BEFORE UPDATE ON public.procurement_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create procurement_quotes table for comparing supplier quotes
CREATE TABLE public.procurement_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procurement_item_id UUID NOT NULL REFERENCES public.procurement_items(id) ON DELETE CASCADE,
  
  supplier_name TEXT NOT NULL,
  supplier_email TEXT,
  supplier_phone TEXT,
  
  quoted_amount NUMERIC NOT NULL,
  quote_valid_until DATE,
  lead_time_days INTEGER,
  
  notes TEXT,
  is_selected BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on quotes
ALTER TABLE public.procurement_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage quotes for their procurement items"
  ON public.procurement_quotes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.procurement_items pi
      WHERE pi.id = procurement_item_id
      AND public.has_project_access(auth.uid(), pi.project_id)
    )
  );

-- Create procurement_audit_log for tracking changes
CREATE TABLE public.procurement_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procurement_item_id UUID NOT NULL REFERENCES public.procurement_items(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  changed_by UUID REFERENCES auth.users(id),
  change_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.procurement_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their procurement items"
  ON public.procurement_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.procurement_items pi
      WHERE pi.id = procurement_item_id
      AND public.has_project_access(auth.uid(), pi.project_id)
    )
  );

-- Function to log procurement status changes
CREATE OR REPLACE FUNCTION public.log_procurement_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.procurement_audit_log (
      procurement_item_id,
      action_type,
      old_status,
      new_status,
      changed_by,
      change_details
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      auth.uid(),
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for status change logging
CREATE TRIGGER log_procurement_status_changes
  AFTER UPDATE ON public.procurement_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_procurement_status_change();

-- Function to auto-create roadmap item when procurement item is created
CREATE OR REPLACE FUNCTION public.create_procurement_roadmap_item()
RETURNS TRIGGER AS $$
DECLARE
  v_roadmap_item_id UUID;
BEGIN
  -- Create a roadmap item in the "Procurement" phase
  INSERT INTO public.project_roadmap_items (
    project_id,
    title,
    description,
    phase,
    priority,
    is_completed,
    sort_order
  ) VALUES (
    NEW.project_id,
    'Order: ' || NEW.name,
    COALESCE(NEW.description, 'Procurement item from ' || NEW.source_type),
    'Procurement',
    CASE NEW.priority
      WHEN 'urgent' THEN 'critical'
      WHEN 'high' THEN 'high'
      WHEN 'normal' THEN 'medium'
      ELSE 'low'
    END,
    false,
    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.project_roadmap_items WHERE project_id = NEW.project_id AND phase = 'Procurement')
  ) RETURNING id INTO v_roadmap_item_id;
  
  -- Link the roadmap item back to procurement item
  NEW.roadmap_item_id := v_roadmap_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create roadmap item
CREATE TRIGGER create_procurement_roadmap_item_trigger
  BEFORE INSERT ON public.procurement_items
  FOR EACH ROW
  EXECUTE FUNCTION public.create_procurement_roadmap_item();

-- Function to sync procurement status to roadmap item
CREATE OR REPLACE FUNCTION public.sync_procurement_to_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.roadmap_item_id IS NOT NULL THEN
    UPDATE public.project_roadmap_items
    SET 
      is_completed = (NEW.status = 'delivered'),
      completed_at = CASE WHEN NEW.status = 'delivered' THEN now() ELSE NULL END
    WHERE id = NEW.roadmap_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to sync status
CREATE TRIGGER sync_procurement_roadmap_trigger
  AFTER UPDATE ON public.procurement_items
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sync_procurement_to_roadmap();