-- Add item_id column to final_account_section_comments to allow per-item comments
ALTER TABLE public.final_account_section_comments 
ADD COLUMN item_id UUID REFERENCES public.final_account_items(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_section_comments_item_id ON public.final_account_section_comments(item_id);

-- Add comment to clarify usage
COMMENT ON COLUMN public.final_account_section_comments.item_id IS 'Optional reference to a specific item. NULL means section-level comment.';