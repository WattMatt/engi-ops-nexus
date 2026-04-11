CREATE TABLE IF NOT EXISTS drawing_transmittals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  drawing_id uuid REFERENCES project_drawings(id) ON DELETE CASCADE,
  transmitted_to text NOT NULL,
  transmittal_date date NOT NULL DEFAULT CURRENT_DATE,
  method text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drawing_transmittals_drawing_id_idx
  ON drawing_transmittals(drawing_id);

ALTER TABLE drawing_transmittals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read transmittals"
  ON drawing_transmittals FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Auth users can insert transmittals"
  ON drawing_transmittals FOR INSERT
  TO authenticated WITH CHECK (true);