-- Create prize proposals table for admin-configurable prize options
CREATE TABLE public.gamification_prize_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prize_type TEXT NOT NULL DEFAULT 'voucher',
  default_value NUMERIC,
  icon TEXT DEFAULT '🎁',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.gamification_prize_proposals ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage prize proposals"
ON public.gamification_prize_proposals
FOR ALL
USING (public.is_admin(auth.uid()));

-- Allow read for authenticated users (for email templates)
CREATE POLICY "Authenticated users can view enabled proposals"
ON public.gamification_prize_proposals
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_enabled = true);

-- Insert default prize proposals
INSERT INTO public.gamification_prize_proposals (name, description, prize_type, default_value, icon, is_enabled, display_order) VALUES
('R500 Takealot Voucher', 'Digital voucher for online shopping', 'voucher', 500, '🛒', true, 1),
('R250 Coffee Shop Voucher', 'Enjoy a coffee break on us', 'voucher', 250, '☕', true, 2),
('4 Hours Extra Leave', 'Take an afternoon off', 'leave_hours', 0, '🏖️', true, 3),
('Team Lunch', 'Lunch for you and your team', 'team_lunch', 500, '🍕', true, 4),
('Company Hoodie', 'Premium branded company swag', 'company_swag', 350, '👕', true, 5),
('R1000 Shopping Voucher', 'Major shopping spree', 'voucher', 1000, '🎉', false, 6),
('Full Day Off', 'A complete day of paid leave', 'leave_hours', 0, '✨', false, 7);