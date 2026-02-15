// Cable Calculation Validation Functions
// CRITICAL: All validations based on SANS 10142-1 requirements

import { CableData } from '../data/cable-specs';
import { ValidationWarning } from '../types/cableTypes';

/**
 * Validate that the selected cable can actually carry the load
 */
export function validateCableCapacity(
  cable: CableData,
  loadAmps: number,
  installationMethod: 'ground' | 'ducts' | 'air',
  deratingFactor: number = 1.0
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  const currentRating = installationMethod === 'air' ? cable.currentRatingAir :
                        installationMethod === 'ground' ? cable.currentRatingGround :
                        cable.currentRatingDucts;
  
  const deratedRating = currentRating * deratingFactor;
  
  if (loadAmps > deratedRating) {
    warnings.push({
      type: 'error',
      message: `UNSAFE: Cable ${cable.size} cannot carry ${loadAmps}A (max ${deratedRating.toFixed(1)}A after derating). This calculation is INVALID.`,
      field: 'cable_size'
    });
  } else if (loadAmps > deratedRating * 0.9) {
    warnings.push({
      type: 'warning',
      message: `Cable ${cable.size} is running at ${((loadAmps/deratedRating)*100).toFixed(1)}% capacity. Consider upsizing for safety margin.`,
      field: 'cable_size'
    });
  }
  
  return warnings;
}

/**
 * Validate voltage drop is within SANS limits
 */
export function validateVoltageDrop(
  voltDropPercentage: number,
  voltage: number
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const maxAllowed = voltage === 400 ? 5 : 3;
  
  if (voltDropPercentage > maxAllowed) {
    warnings.push({
      type: 'error',
      message: `Voltage drop ${voltDropPercentage.toFixed(2)}% exceeds SANS 10142-1 limit of ${maxAllowed}%. Cable size must be increased.`,
      field: 'volt_drop'
    });
  } else if (voltDropPercentage > maxAllowed * 0.8) {
    warnings.push({
      type: 'warning',
      message: `Voltage drop ${voltDropPercentage.toFixed(2)}% is approaching limit of ${maxAllowed}%.`,
      field: 'volt_drop'
    });
  }
  
  return warnings;
}

/**
 * Validate that impedance matches expected range for cable size
 * This helps catch data table errors
 */
export function validateImpedanceForSize(
  cable: CableData
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  // Extract numeric CSA from size string (e.g., "25mm²" -> 25)
  const csaMatch = cable.size.match(/(\d+\.?\d*)/);
  if (!csaMatch) return warnings;
  
  const csa = parseFloat(csaMatch[1]);
  
  // Approximate expected impedance for copper (Ω/km)
  // Formula: ρ/A where ρ ≈ 0.0175 Ωmm²/m for copper at 20°C
  const expectedImpedance = 17.5 / csa; // Convert to Ω/km
  
  // Allow 30% tolerance for different conductor types/constructions
  const tolerance = 0.3;
  const minExpected = expectedImpedance * (1 - tolerance);
  const maxExpected = expectedImpedance * (1 + tolerance);
  
  if (cable.impedance < minExpected || cable.impedance > maxExpected) {
    warnings.push({
      type: 'warning',
      message: `Impedance ${cable.impedance.toFixed(4)}Ω/km for ${cable.size} seems unusual (expected ~${expectedImpedance.toFixed(4)}Ω/km). VERIFY against SANS 10142-1 tables.`,
      field: 'ohm_per_km'
    });
  }
  
  return warnings;
}

/**
 * Validate that all calculation inputs are sensible
 */
export function validateCalculationInputs(
  loadAmps: number,
  voltage: number,
  length: number
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  if (loadAmps <= 0) {
    warnings.push({
      type: 'error',
      message: 'Load current must be greater than 0A',
      field: 'load_amps'
    });
  }
  
  if (voltage !== 230 && voltage !== 400) {
    warnings.push({
      type: 'warning',
      message: `Unusual voltage ${voltage}V. Standard values are 230V (single phase) or 400V (three phase).`,
      field: 'voltage'
    });
  }
  
  if (length > 1000) {
    warnings.push({
      type: 'warning',
      message: `Cable length ${length}m is very long. Verify voltage drop calculations carefully.`,
      field: 'total_length'
    });
  }
  
  if (length <= 0) {
    warnings.push({
      type: 'info',
      message: 'No cable length specified - voltage drop not calculated',
      field: 'total_length'
    });
  }
  
  return warnings;
}

/**
 * Master validation function - returns all warnings/errors
 */
export function validateCableCalculation(
  cable: CableData,
  loadAmps: number,
  voltage: number,
  length: number,
  voltDropPercentage: number,
  installationMethod: 'ground' | 'ducts' | 'air',
  deratingFactor: number = 1.0
): { warnings: ValidationWarning[], requiresVerification: boolean } {
  const allWarnings: ValidationWarning[] = [];
  
  // Validate inputs
  allWarnings.push(...validateCalculationInputs(loadAmps, voltage, length));
  
  // Validate cable capacity (CRITICAL)
  allWarnings.push(...validateCableCapacity(cable, loadAmps, installationMethod, deratingFactor));
  
  // Validate voltage drop
  if (length > 0) {
    allWarnings.push(...validateVoltageDrop(voltDropPercentage, voltage));
  }
  
  // Validate impedance data integrity
  allWarnings.push(...validateImpedanceForSize(cable));
  
  // Add global warning about table verification
  const hasErrors = allWarnings.some(w => w.type === 'error');
  if (hasErrors || allWarnings.length > 0) {
    allWarnings.push({
      type: 'warning',
      message: '⚠️ ALL calculations must be verified by a qualified electrical engineer before use.'
    });
  }
  
  return {
    warnings: allWarnings,
    requiresVerification: hasErrors || allWarnings.some(w => w.message.includes('VERIFY'))
  };
}
