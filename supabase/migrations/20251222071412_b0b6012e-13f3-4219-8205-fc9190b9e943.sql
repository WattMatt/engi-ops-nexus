-- Make item_id nullable to allow deletion history records
ALTER TABLE public.final_account_item_history 
ALTER COLUMN item_id DROP NOT NULL;