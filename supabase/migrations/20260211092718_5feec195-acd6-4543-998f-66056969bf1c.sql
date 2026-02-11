
-- Create storage bucket for legend card reports
INSERT INTO storage.buckets (id, name, public) VALUES ('legend-card-reports', 'legend-card-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can read legend card reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'legend-card-reports');

CREATE POLICY "Service role can upload legend card reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'legend-card-reports');
