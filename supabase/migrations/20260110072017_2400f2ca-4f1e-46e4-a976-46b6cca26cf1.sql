-- Add procurement tracking fields directly to final_account_items table
-- This embeds procurement tracking into the Prime Cost workflow

ALTER TABLE public.final_account_items
ADD COLUMN IF NOT EXISTS procurement_status text DEFAULT 'not_started' 
  CHECK (procurement_status IN ('not_started', 'pending_quote', 'quote_received', 'pending_approval', 'approved', 'ordered', 'in_transit', 'delivered', 'cancelled')),
ADD COLUMN IF NOT EXISTS supplier_name text,
ADD COLUMN IF NOT EXISTS po_number text,
ADD COLUMN IF NOT EXISTS quote_amount numeric,
ADD COLUMN IF NOT EXISTS order_date date,
ADD COLUMN IF NOT EXISTS expected_delivery date,
ADD COLUMN IF NOT EXISTS actual_delivery date,
ADD COLUMN IF NOT EXISTS lead_time_days integer,
ADD COLUMN IF NOT EXISTS procurement_notes text,
ADD COLUMN IF NOT EXISTS approved_by text,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Create index for procurement status filtering
CREATE INDEX IF NOT EXISTS idx_final_account_items_procurement_status 
ON public.final_account_items(procurement_status) 
WHERE is_prime_cost = true;

-- Drop the separate procurement_items table since we're embedding into Prime Costs
-- Keep procurement_quotes for quote comparison
-- Drop procurement_audit_log since we can use the existing item history

-- Update the procurement_quotes table to reference final_account_items instead
ALTER TABLE public.procurement_quotes 
DROP CONSTRAINT IF EXISTS procurement_quotes_procurement_item_id_fkey;

ALTER TABLE public.procurement_quotes 
RENAME COLUMN procurement_item_id TO final_account_item_id;

ALTER TABLE public.procurement_quotes
ADD CONSTRAINT procurement_quotes_final_account_item_id_fkey 
FOREIGN KEY (final_account_item_id) REFERENCES public.final_account_items(id) ON DELETE CASCADE;

-- Drop the procurement_items table as it's no longer needed
DROP TABLE IF EXISTS public.procurement_items CASCADE;

-- Drop the procurement_audit_log table as we can use item history
DROP TABLE IF EXISTS public.procurement_audit_log CASCADE;