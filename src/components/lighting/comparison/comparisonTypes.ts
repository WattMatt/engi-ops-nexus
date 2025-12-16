import { LightingFitting } from '../lightingTypes';
import { Json } from '@/integrations/supabase/types';

export interface ComparisonSettings {
  electricity_rate: number;
  operating_hours_per_day: number;
  analysis_period_years: number;
  include_vat: boolean;
  vat_rate: number;
}

export interface SavedComparison {
  id: string;
  project_id: string | null;
  comparison_name: string;
  fitting_ids: string[];
  comparison_criteria: Json | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const parseComparisonCriteria = (json: Json | null): ComparisonSettings | null => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;
  return {
    electricity_rate: Number(obj.electricity_rate) || DEFAULT_SETTINGS.electricity_rate,
    operating_hours_per_day: Number(obj.operating_hours_per_day) || DEFAULT_SETTINGS.operating_hours_per_day,
    analysis_period_years: Number(obj.analysis_period_years) || DEFAULT_SETTINGS.analysis_period_years,
    include_vat: Boolean(obj.include_vat),
    vat_rate: Number(obj.vat_rate) || DEFAULT_SETTINGS.vat_rate,
  };
};

export interface ComparisonMetrics {
  fitting: LightingFitting;
  efficacy: number; // lm/W
  costPerKLumen: number; // R/1000lm
  totalCost: number; // supply + install
  monthlyKwh: number;
  annualEnergyCost: number;
  fiveYearTotalCost: number;
  efficiencyRating: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
}

export const DEFAULT_SETTINGS: ComparisonSettings = {
  electricity_rate: 2.40,
  operating_hours_per_day: 10,
  analysis_period_years: 5,
  include_vat: true,
  vat_rate: 15,
};

export const getEfficiencyRating = (efficacy: number): ComparisonMetrics['efficiencyRating'] => {
  if (efficacy >= 130) return 'A';
  if (efficacy >= 110) return 'B';
  if (efficacy >= 90) return 'C';
  if (efficacy >= 70) return 'D';
  if (efficacy >= 50) return 'E';
  if (efficacy >= 30) return 'F';
  return 'G';
};

export const calculateMetrics = (
  fitting: LightingFitting,
  quantity: number,
  settings: ComparisonSettings
): ComparisonMetrics => {
  const wattage = fitting.wattage || 0;
  const lumens = fitting.lumen_output || 0;
  
  const efficacy = wattage > 0 ? lumens / wattage : 0;
  const costPerKLumen = lumens > 0 ? ((fitting.supply_cost + fitting.install_cost) / lumens) * 1000 : 0;
  const totalCost = fitting.supply_cost + fitting.install_cost;
  
  // Energy calculations
  const dailyKwh = (wattage * quantity * settings.operating_hours_per_day) / 1000;
  const monthlyKwh = dailyKwh * 30;
  const annualKwh = dailyKwh * 365;
  
  let annualEnergyCost = annualKwh * settings.electricity_rate;
  if (settings.include_vat) {
    annualEnergyCost *= (1 + settings.vat_rate / 100);
  }
  
  const capitalCost = totalCost * quantity;
  const fiveYearEnergyCost = annualEnergyCost * settings.analysis_period_years;
  const fiveYearTotalCost = capitalCost + fiveYearEnergyCost;
  
  return {
    fitting,
    efficacy,
    costPerKLumen,
    totalCost,
    monthlyKwh,
    annualEnergyCost,
    fiveYearTotalCost,
    efficiencyRating: getEfficiencyRating(efficacy),
  };
};
