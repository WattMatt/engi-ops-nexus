-- Create table to store application reviews
CREATE TABLE IF NOT EXISTS public.application_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_data JSONB NOT NULL,
  focus_areas TEXT[] NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  review_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_reviews ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view reviews
CREATE POLICY "Users can view application reviews"
  ON public.application_reviews
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert reviews
CREATE POLICY "Users can create application reviews"
  ON public.application_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index on review_date for faster queries
CREATE INDEX idx_application_reviews_review_date ON public.application_reviews(review_date DESC);

-- Create updated_at trigger
CREATE TRIGGER update_application_reviews_updated_at
  BEFORE UPDATE ON public.application_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.application_reviews IS 'Stores AI-generated application review reports for tracking improvements over time';