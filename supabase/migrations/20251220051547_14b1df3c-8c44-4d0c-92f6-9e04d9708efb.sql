-- Create storage bucket for section review PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('final-account-reviews', 'final-account-reviews', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for review PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'final-account-reviews');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload review PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'final-account-reviews' AND auth.role() = 'authenticated');

-- Add pdf_url column to reviews table
ALTER TABLE public.final_account_section_reviews
ADD COLUMN IF NOT EXISTS pdf_url TEXT;