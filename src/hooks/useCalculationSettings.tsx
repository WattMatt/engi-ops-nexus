import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CalculationSettings {
  voltage_drop_limit_400v: number;
  voltage_drop_limit_230v: number;
  power_factor_power: number;
  power_factor_lighting: number;
  power_factor_motor: number;
  power_factor_hvac: number;
  ambient_temp_baseline: number;
  grouping_factor_2_circuits: number;
  grouping_factor_3_circuits: number;
  grouping_factor_4plus_circuits: number;
  cable_safety_margin: number;
  max_amps_per_cable: number;
  preferred_amps_per_cable: number;
  k_factor_copper: number;
  k_factor_aluminium: number;
  calculation_standard: string;
  default_installation_method: string;
  default_cable_material: string;
  default_insulation_type: string;
}

const defaultSettings: CalculationSettings = {
  voltage_drop_limit_400v: 5.0,
  voltage_drop_limit_230v: 3.0,
  power_factor_power: 0.85,
  power_factor_lighting: 0.95,
  power_factor_motor: 0.80,
  power_factor_hvac: 0.85,
  ambient_temp_baseline: 30,
  grouping_factor_2_circuits: 0.80,
  grouping_factor_3_circuits: 0.70,
  grouping_factor_4plus_circuits: 0.65,
  cable_safety_margin: 1.15,
  max_amps_per_cable: 400,
  preferred_amps_per_cable: 300,
  k_factor_copper: 115,
  k_factor_aluminium: 76,
  calculation_standard: "SANS 10142-1",
  default_installation_method: "air",
  default_cable_material: "Aluminium",
  default_insulation_type: "PVC",
};

export const useCalculationSettings = (projectId: string | null) => {
  return useQuery({
    queryKey: ["calculation-settings", projectId],
    queryFn: async () => {
      if (!projectId) return defaultSettings;

      const { data, error } = await supabase
        .from("cable_calculation_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      return data || defaultSettings;
    },
    enabled: !!projectId,
  });
};
