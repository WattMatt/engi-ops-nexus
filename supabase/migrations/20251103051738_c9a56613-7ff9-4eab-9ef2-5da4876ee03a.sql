-- Add password security tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Create password reset requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  requested_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for password_reset_requests
CREATE POLICY "Users can view own reset requests"
  ON public.password_reset_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reset requests"
  ON public.password_reset_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create reset requests"
  ON public.password_reset_requests FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));