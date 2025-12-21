-- Add fields to track P&A items and their parent relationship
ALTER TABLE public.final_account_items 
ADD COLUMN IF NOT EXISTS is_pa_item boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pa_parent_item_id uuid REFERENCES public.final_account_items(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS pa_percentage numeric DEFAULT 0;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_final_account_items_pa_parent ON public.final_account_items(pa_parent_item_id) WHERE pa_parent_item_id IS NOT NULL;