-- Create enum for review status
CREATE TYPE public.section_review_status AS ENUM ('draft', 'sent_for_review', 'under_review', 'disputed', 'approved');

-- Create section reviews table
CREATE TABLE public.final_account_section_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.final_account_sections(id) ON DELETE CASCADE,
  reviewer_contact_id UUID REFERENCES public.project_contacts(id) ON DELETE SET NULL,
  reviewer_email TEXT,
  reviewer_name TEXT,
  status section_review_status NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  access_token TEXT UNIQUE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create section comments table
CREATE TABLE public.final_account_section_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.final_account_sections(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.final_account_section_reviews(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('internal', 'contractor')),
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add status column to sections table
ALTER TABLE public.final_account_sections 
ADD COLUMN IF NOT EXISTS review_status section_review_status DEFAULT 'draft';

-- Enable RLS
ALTER TABLE public.final_account_section_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_account_section_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Users can view reviews for their bills" 
ON public.final_account_section_reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.final_account_sections s
    JOIN public.final_account_bills b ON s.bill_id = b.id
    JOIN public.final_accounts fa ON b.final_account_id = fa.id
    WHERE s.id = section_id 
    AND public.has_project_access(auth.uid(), fa.project_id)
  )
  OR access_token IS NOT NULL
);

CREATE POLICY "Users can create reviews for their bills" 
ON public.final_account_section_reviews 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.final_account_sections s
    JOIN public.final_account_bills b ON s.bill_id = b.id
    JOIN public.final_accounts fa ON b.final_account_id = fa.id
    WHERE s.id = section_id 
    AND public.has_project_access(auth.uid(), fa.project_id)
  )
);

CREATE POLICY "Users can update reviews for their bills" 
ON public.final_account_section_reviews 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.final_account_sections s
    JOIN public.final_account_bills b ON s.bill_id = b.id
    JOIN public.final_accounts fa ON b.final_account_id = fa.id
    WHERE s.id = section_id 
    AND public.has_project_access(auth.uid(), fa.project_id)
  )
  OR access_token IS NOT NULL
);

-- RLS Policies for comments
CREATE POLICY "Users can view comments for accessible sections" 
ON public.final_account_section_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.final_account_sections s
    JOIN public.final_account_bills b ON s.bill_id = b.id
    JOIN public.final_accounts fa ON b.final_account_id = fa.id
    WHERE s.id = section_id 
    AND public.has_project_access(auth.uid(), fa.project_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.final_account_section_reviews r
    WHERE r.id = review_id AND r.access_token IS NOT NULL
  )
);

CREATE POLICY "Users can create comments" 
ON public.final_account_section_comments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.final_account_sections s
    JOIN public.final_account_bills b ON s.bill_id = b.id
    JOIN public.final_accounts fa ON b.final_account_id = fa.id
    WHERE s.id = section_id 
    AND public.has_project_access(auth.uid(), fa.project_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.final_account_section_reviews r
    WHERE r.id = review_id AND r.access_token IS NOT NULL
  )
);

-- Create function to generate access token
CREATE OR REPLACE FUNCTION public.generate_review_access_token()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.gen_random_bytes(32), 'hex')
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_section_reviews_updated_at
BEFORE UPDATE ON public.final_account_section_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();