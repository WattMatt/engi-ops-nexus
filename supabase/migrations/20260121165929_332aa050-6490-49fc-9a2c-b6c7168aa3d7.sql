-- Gamification Winners table to track weekly/monthly winners
CREATE TABLE public.gamification_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_completions INTEGER NOT NULL DEFAULT 0,
  total_streak_days INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 1,
  announced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_type, period_start)
);

-- Gamification Prizes table to track rewards given
CREATE TABLE public.gamification_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winner_id UUID REFERENCES public.gamification_winners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  prize_type TEXT NOT NULL,
  prize_description TEXT NOT NULL,
  prize_value DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awarded', 'claimed', 'expired')),
  awarded_by UUID,
  awarded_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gamification Settings table for configuration
CREATE TABLE public.gamification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.gamification_settings (setting_key, setting_value, description) VALUES
  ('weekly_announcement', '{"enabled": true, "day": "friday", "time": "16:00", "email_subject": "🏆 Weekly Winner Announcement!", "notify_all_users": true}', 'Weekly winner announcement settings'),
  ('monthly_announcement', '{"enabled": true, "day": 1, "time": "09:00", "email_subject": "🎉 Monthly Champion Crowned!", "notify_all_users": true}', 'Monthly winner announcement settings'),
  ('prize_types', '{"types": ["voucher", "leave_hours", "team_lunch", "company_swag", "other"]}', 'Available prize types'),
  ('badge_settings', '{"show_weekly_badge": true, "show_monthly_badge": true, "weekly_badge_duration_days": 7, "monthly_badge_duration_days": 30}', 'Winner badge display settings');

-- Enable RLS
ALTER TABLE public.gamification_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gamification_winners (viewable by all authenticated, managed by admins)
CREATE POLICY "Anyone can view winners" ON public.gamification_winners
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage winners" ON public.gamification_winners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for gamification_prizes
CREATE POLICY "Users can view their own prizes" ON public.gamification_prizes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all prizes" ON public.gamification_prizes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage prizes" ON public.gamification_prizes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for gamification_settings (read by all, write by admins)
CREATE POLICY "Anyone can view settings" ON public.gamification_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.gamification_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create updated_at trigger for prizes
CREATE TRIGGER update_gamification_prizes_updated_at
  BEFORE UPDATE ON public.gamification_prizes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for settings
CREATE TRIGGER update_gamification_settings_updated_at
  BEFORE UPDATE ON public.gamification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_gamification_winners_user_id ON public.gamification_winners(user_id);
CREATE INDEX idx_gamification_winners_period ON public.gamification_winners(period_type, period_start);
CREATE INDEX idx_gamification_prizes_user_id ON public.gamification_prizes(user_id);
CREATE INDEX idx_gamification_prizes_status ON public.gamification_prizes(status);