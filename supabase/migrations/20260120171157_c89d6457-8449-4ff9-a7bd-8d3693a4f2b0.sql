-- Create standard load profile templates that can be linked to tenants
CREATE TABLE IF NOT EXISTS public.standard_load_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- retail, food, office, anchor, etc.
  va_per_sqm NUMERIC DEFAULT 75, -- VA per square meter
  diversity_factor NUMERIC DEFAULT 0.8,
  power_factor NUMERIC DEFAULT 0.9,
  typical_breaker_size TEXT, -- e.g., "60A TP", "100A TP"
  peak_hours_start INTEGER DEFAULT 9, -- Start of peak demand period
  peak_hours_end INTEGER DEFAULT 17, -- End of peak demand period
  base_load_factor NUMERIC DEFAULT 0.3, -- Minimum load as % of peak
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS
ALTER TABLE public.standard_load_profiles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read standard profiles
CREATE POLICY "Anyone can read standard load profiles"
ON public.standard_load_profiles
FOR SELECT
USING (true);

-- Add profile link to meter_shop_linkages
ALTER TABLE public.meter_shop_linkages 
ADD COLUMN IF NOT EXISTS standard_profile_id UUID REFERENCES public.standard_load_profiles(id);

-- Insert standard profile templates based on SANS 10142-1 / NRS 034-1
INSERT INTO public.standard_load_profiles (name, description, category, va_per_sqm, diversity_factor, power_factor, typical_breaker_size, peak_hours_start, peak_hours_end, base_load_factor)
VALUES
  ('Anchor Retail', 'Large anchor tenant (Woolworths, Checkers, Pick n Pay)', 'anchor', 80, 0.7, 0.9, '400A TP', 8, 20, 0.35),
  ('Major Retail', 'Major tenant (Clicks, Dis-Chem, Game)', 'major', 75, 0.75, 0.9, '200A TP', 9, 18, 0.30),
  ('Line Shop Standard', 'Standard line shop retail', 'line_shop', 65, 0.8, 0.9, '60A TP', 9, 18, 0.25),
  ('Line Shop Premium', 'Premium line shop (fashion, electronics)', 'line_shop', 85, 0.75, 0.9, '80A TP', 9, 18, 0.30),
  ('Food Court', 'Food court tenant with cooking equipment', 'food', 150, 0.85, 0.85, '100A TP', 11, 21, 0.40),
  ('Restaurant Casual', 'Casual dining restaurant', 'restaurant', 120, 0.8, 0.85, '80A TP', 11, 22, 0.35),
  ('Restaurant Fine Dining', 'Fine dining with full kitchen', 'restaurant', 180, 0.75, 0.85, '150A TP', 17, 23, 0.25),
  ('Coffee Shop', 'Coffee shop with basic equipment', 'food', 100, 0.85, 0.9, '60A TP', 6, 18, 0.30),
  ('Entertainment', 'Cinema, arcade, bowling', 'entertainment', 90, 0.7, 0.85, '200A TP', 14, 23, 0.20),
  ('Services', 'Bank, salon, dry cleaner', 'services', 50, 0.8, 0.95, '40A TP', 8, 17, 0.25),
  ('Kiosk', 'Small kiosk or island', 'kiosk', 100, 0.9, 0.9, '20A SP', 9, 18, 0.30),
  ('ATM', 'ATM or self-service terminal', 'atm', 50, 0.95, 0.95, '10A SP', 0, 23, 0.80),
  ('Common Areas', 'Passages, parking, amenities', 'common', 25, 0.6, 0.9, '100A TP', 6, 22, 0.40),
  ('Office', 'Office space with standard equipment', 'office', 55, 0.75, 0.95, '60A TP', 7, 18, 0.20),
  ('Medical', 'Medical rooms, clinic, pharmacy', 'medical', 70, 0.8, 0.9, '80A TP', 8, 17, 0.30),
  ('Gym/Fitness', 'Gym with exercise equipment', 'entertainment', 60, 0.7, 0.9, '100A TP', 5, 22, 0.25)
ON CONFLICT DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_standard_load_profiles_category ON public.standard_load_profiles(category);
CREATE INDEX IF NOT EXISTS idx_meter_shop_linkages_profile ON public.meter_shop_linkages(standard_profile_id);