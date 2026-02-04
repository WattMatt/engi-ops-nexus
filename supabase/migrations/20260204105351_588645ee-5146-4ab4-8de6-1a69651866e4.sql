-- Add instruction_date and order_date columns to project_procurement_items
ALTER TABLE public.project_procurement_items 
ADD COLUMN IF NOT EXISTS instruction_date date,
ADD COLUMN IF NOT EXISTS order_date date;

-- Add a comment for clarity
COMMENT ON COLUMN public.project_procurement_items.instruction_date IS 'Date the instruction was tabled by project manager';
COMMENT ON COLUMN public.project_procurement_items.order_date IS 'Date the order was given by contractor';