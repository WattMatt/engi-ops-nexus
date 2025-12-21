-- Add prime cost flag and related fields to final_account_items
ALTER TABLE public.final_account_items 
ADD COLUMN IF NOT EXISTS is_prime_cost boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pc_allowance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pc_actual_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pc_profit_attendance_percent numeric DEFAULT 0;

-- Add comments
COMMENT ON COLUMN public.final_account_items.is_prime_cost IS 'True if this item is a Prime Cost or Provisional Sum item';
COMMENT ON COLUMN public.final_account_items.pc_allowance IS 'Prime Cost allowance from the original contract';
COMMENT ON COLUMN public.final_account_items.pc_actual_cost IS 'Actual cost spent on this Prime Cost item';
COMMENT ON COLUMN public.final_account_items.pc_profit_attendance_percent IS 'Profit and Attendance percentage for this PC item';