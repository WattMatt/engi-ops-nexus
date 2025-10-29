-- Create storage buckets for screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('issue-screenshots', 'issue-screenshots', true),
  ('suggestion-screenshots', 'suggestion-screenshots', true);

-- Create storage policies for issue-screenshots bucket
CREATE POLICY "Authenticated users can upload issue screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'issue-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view issue screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'issue-screenshots');

-- Create storage policies for suggestion-screenshots bucket
CREATE POLICY "Authenticated users can upload suggestion screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'suggestion-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view suggestion screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'suggestion-screenshots');

-- Create issue_reports table
CREATE TABLE public.issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'new',
  screenshot_url TEXT,
  page_url TEXT NOT NULL,
  browser_info JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  admin_notes TEXT
);

-- Enable RLS on issue_reports
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for issue_reports
CREATE POLICY "Users can insert their own issue reports"
ON public.issue_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own issue reports"
ON public.issue_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reported_by);

CREATE POLICY "Admins can view all issue reports"
ON public.issue_reports
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all issue reports"
ON public.issue_reports
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all issue reports"
ON public.issue_reports
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create suggestions table
CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'feature',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  page_url TEXT NOT NULL,
  screenshot_url TEXT,
  browser_info JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  admin_notes TEXT
);

-- Enable RLS on suggestions
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies for suggestions
CREATE POLICY "Users can insert their own suggestions"
ON public.suggestions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own suggestions"
ON public.suggestions
FOR SELECT
TO authenticated
USING (auth.uid() = reported_by);

CREATE POLICY "Admins can view all suggestions"
ON public.suggestions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all suggestions"
ON public.suggestions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all suggestions"
ON public.suggestions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create trigger to update updated_at timestamp for issue_reports
CREATE TRIGGER update_issue_reports_updated_at
BEFORE UPDATE ON public.issue_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to update updated_at timestamp for suggestions
CREATE TRIGGER update_suggestions_updated_at
BEFORE UPDATE ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();