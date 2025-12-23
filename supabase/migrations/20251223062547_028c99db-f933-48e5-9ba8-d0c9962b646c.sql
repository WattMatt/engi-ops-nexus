-- Add reviewer credentials columns to store authorization information
ALTER TABLE public.final_account_section_reviews 
ADD COLUMN IF NOT EXISTS reviewer_position text,
ADD COLUMN IF NOT EXISTS reviewer_company text,
ADD COLUMN IF NOT EXISTS reviewer_id_number text,
ADD COLUMN IF NOT EXISTS authorization_confirmed boolean DEFAULT false;