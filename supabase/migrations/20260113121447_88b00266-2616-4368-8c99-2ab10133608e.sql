-- Create table for contact categories
CREATE TABLE public.contact_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_categories ENABLE ROW LEVEL SECURITY;

-- Create policies - categories are shared across all users (global)
CREATE POLICY "Anyone can view contact categories" 
ON public.contact_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create contact categories" 
ON public.contact_categories 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete custom contact categories" 
ON public.contact_categories 
FOR DELETE 
USING (is_custom = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contact_categories_updated_at
BEFORE UPDATE ON public.contact_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();