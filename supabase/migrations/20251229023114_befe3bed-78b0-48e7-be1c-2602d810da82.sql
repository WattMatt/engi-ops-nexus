-- Create a table to track quantity contributions from each floor plan to final account items
-- This enables proper re-sync behavior by tracking deltas instead of blindly adding
CREATE TABLE public.floor_plan_quantity_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL,
  final_account_item_id UUID NOT NULL REFERENCES public.final_account_items(id) ON DELETE CASCADE,
  quantity_contributed NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(floor_plan_id, final_account_item_id)
);

-- Enable RLS
ALTER TABLE public.floor_plan_quantity_contributions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view floor plan contributions"
ON public.floor_plan_quantity_contributions
FOR SELECT
USING (true);

CREATE POLICY "Users can manage floor plan contributions"
ON public.floor_plan_quantity_contributions
FOR ALL
USING (true);

-- Create index for performance
CREATE INDEX idx_floor_plan_contributions_floor_plan ON public.floor_plan_quantity_contributions(floor_plan_id);
CREATE INDEX idx_floor_plan_contributions_item ON public.floor_plan_quantity_contributions(final_account_item_id);