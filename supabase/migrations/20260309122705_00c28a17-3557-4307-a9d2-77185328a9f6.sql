
CREATE TABLE public.coc_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Certificate details
  coc_reference_number TEXT NOT NULL,
  certificate_type TEXT NOT NULL DEFAULT 'initial',
  installation_address TEXT NOT NULL DEFAULT '',
  installation_type TEXT NOT NULL DEFAULT 'residential',
  phase_configuration TEXT NOT NULL DEFAULT 'single_phase',
  supply_voltage NUMERIC NOT NULL DEFAULT 230,
  supply_frequency NUMERIC NOT NULL DEFAULT 50,
  
  -- Registered person
  registered_person_name TEXT NOT NULL DEFAULT '',
  registration_number TEXT NOT NULL DEFAULT '',
  registration_category TEXT NOT NULL DEFAULT 'installation_electrician',
  
  -- Test report (ALL numeric, NEVER boolean for measurements)
  insulation_resistance_mohm NUMERIC,
  earth_loop_impedance_zs_ohm NUMERIC,
  rcd_trip_time_ms NUMERIC,
  rcd_rated_current_ma NUMERIC NOT NULL DEFAULT 30,
  pscc_ka NUMERIC,
  earth_continuity_ohm NUMERIC,
  voltage_at_main_db_v NUMERIC,
  polarity_correct BOOLEAN NOT NULL DEFAULT false,
  
  -- Signature
  has_signature BOOLEAN NOT NULL DEFAULT false,
  signature_date DATE,
  
  -- Solar/BESS
  has_solar_pv BOOLEAN NOT NULL DEFAULT false,
  has_bess BOOLEAN NOT NULL DEFAULT false,
  solar_grounding_verified BOOLEAN,
  inverter_sync_verified BOOLEAN,
  bess_fire_protection BOOLEAN,
  spd_operational BOOLEAN,
  afdd_installed BOOLEAN,
  
  -- Validation results
  validation_status TEXT NOT NULL DEFAULT 'INVALID',
  fraud_risk_score TEXT NOT NULL DEFAULT 'LOW',
  passed_rules_count INTEGER NOT NULL DEFAULT 0,
  failed_rules_count INTEGER NOT NULL DEFAULT 0,
  validation_result JSONB
);

ALTER TABLE public.coc_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own COC validations"
  ON public.coc_validations FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert COC validations"
  ON public.coc_validations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own COC validations"
  ON public.coc_validations FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());
