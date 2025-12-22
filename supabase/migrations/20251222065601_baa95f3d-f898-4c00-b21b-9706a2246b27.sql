-- Update existing final_quantity values of 0 to NULL so they display as empty
-- Users can then explicitly enter 0 when they've actually reviewed and confirmed the value
UPDATE public.final_account_items
SET final_quantity = NULL
WHERE final_quantity = 0;