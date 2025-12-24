-- Add fields for Provisional Sums and item type tracking
ALTER TABLE public.final_account_items 
ADD COLUMN IF NOT EXISTS is_provisional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'MEASURED' CHECK (item_type IN ('MEASURED', 'PC', 'PS')),
ADD COLUMN IF NOT EXISTS ps_original_sum NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ps_spent_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- Update existing PC items to have correct item_type
UPDATE public.final_account_items 
SET item_type = 'PC' 
WHERE is_prime_cost = true;

-- Create index for faster filtering by item type
CREATE INDEX IF NOT EXISTS idx_final_account_items_item_type ON public.final_account_items(item_type);
CREATE INDEX IF NOT EXISTS idx_final_account_items_is_provisional ON public.final_account_items(is_provisional);