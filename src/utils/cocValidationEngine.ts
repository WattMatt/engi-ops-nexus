/**
 * COC Validation Engine
 * Strict empirical validation per OHS Act 85 of 1993 & SANS 10142-1:2024
 * 
 * CRITICAL: South African law requires numerical measurements.
 * Checkmarks, "OK", "Pass" are legally void.
 */

// ============================================
// Data Interfaces
// ============================================

export interface COCData {
  cocReferenceNumber: string;
  certificateType: 'initial' | 're-inspection' | 'alteration';
  installationAddress: string;
  registeredPersonName: string;
  registrationNumber: string;
  registrationCategory:
    | 'electrical_tester_single_phase'
    | 'installation_electrician'
    | 'master_installation_electrician';
  dateOfIssue: string;
  installationType: 'residential' | 'commercial' | 'industrial';
  phaseConfiguration: 'single_phase' | 'three_phase';
  supplyVoltage: number;
  supplyFrequency: number;
}

export interface COCTestReport {
  insulationResistance_MOhm: number | null;
  earthLoopImpedance_Zs_Ohm: number | null;
  rcdTripTime_ms: number | null;
  rcdRatedCurrent_mA: number;
  pscc_kA: number | null;
  earthContinuity_Ohm: number | null;
  voltageAtMainDB_V: number | null;
  polarityCorrect: boolean;
  hasSignature: boolean;
  signatureDate: string | null;
  hasSolarPV: boolean;
  hasBESS: boolean;
  solarGroundingVerified: boolean | null;
  inverterSyncVerified: boolean | null;
  bessFireProtection: boolean | null;
  spdOperational: boolean | null;
  afddInstalled: boolean | null;
}

// ============================================
// Validation Result Types
// ============================================

export type COCStatus = 'VALID' | 'INVALID' | 'REQUIRES_REVIEW';
export type FraudRiskScore = 'LOW' | 'MEDIUM' | 'HIGH';
export type RuleSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface COCRuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: RuleSeverity;
  message: string;
  reference: string;
  actualValue?: string;
  expectedValue?: string;
}

export interface COCValidationResult {
  status: COCStatus;
  passedRules: COCRuleResult[];
  failedRules: COCRuleResult[];
  fraudRiskScore: FraudRiskScore;
  fraudRiskReasons: string[];
  totalRulesChecked: number;
  validatedAt: string;
}

// ============================================
// Generic Mark Detection
// ============================================

const GENERIC_MARKS = new Set([
  'ok', 'pass', 'passed', 'good', 'yes', 'done', 'complete',
  'completed', 'satisfactory', 'acceptable', 'fine', 'correct',
  'checked', 'verified', 'n/a', 'na',
]);

const CHECKMARK_CHARS = new Set(['✓', '✔', '☑', '✅', '☒', '▪', '●', '•', '×', '✕']);

/**
 * Detects non-empirical entries that are legally void.
 * South African law requires actual numerical measurements.
 */
export function isGenericMark(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return false;
  if (typeof value === 'number') return false;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return false;

    // Check for checkmark unicode characters
    if (trimmed.length === 1 && CHECKMARK_CHARS.has(trimmed)) return true;

    // Check for known generic words
    if (GENERIC_MARKS.has(trimmed.toLowerCase())) return true;

    // If it's a string that can't be parsed as a number, it's a generic mark
    // (test values MUST be numeric)
    if (isNaN(Number(trimmed))) return true;
  }

  return false;
}

// ============================================
// Validation Rules
// ============================================

function checkIncompleteCertificate(test: COCTestReport): COCRuleResult {
  const missingFields: string[] = [];
  if (test.insulationResistance_MOhm === null) missingFields.push('Insulation Resistance');
  if (test.earthLoopImpedance_Zs_Ohm === null) missingFields.push('Earth Loop Impedance (Zs)');
  if (test.rcdTripTime_ms === null) missingFields.push('RCD Trip Time');
  if (test.pscc_kA === null) missingFields.push('PSCC');

  const passed = missingFields.length === 0;

  return {
    ruleId: 'COC-001',
    ruleName: 'Incomplete Certificate Check',
    passed,
    severity: 'CRITICAL',
    message: passed
      ? 'All mandatory test fields are populated'
      : `Incomplete Certificate (legally void per OHS Act) — Missing: ${missingFields.join(', ')}`,
    reference: 'OHS Act 85 of 1993, Regulation 7(1)',
    actualValue: passed ? 'All present' : `${missingFields.length} field(s) missing`,
    expectedValue: 'All mandatory fields populated with numerical values',
  };
}

function checkIssuerCompetency(data: COCData): COCRuleResult {
  const isThreePhase = data.phaseConfiguration === 'three_phase';
  const isSinglePhaseTester = data.registrationCategory === 'electrical_tester_single_phase';
  const passed = !(isThreePhase && isSinglePhaseTester);

  return {
    ruleId: 'COC-002',
    ruleName: 'Issuer Competency Check',
    passed,
    severity: 'CRITICAL',
    message: passed
      ? 'Issuer registration matches installation phase configuration'
      : 'Issuer not qualified for 3-phase installation — single-phase tester cannot certify 3-phase',
    reference: 'SANS 10142-1, Clause 4.2; OHS Act Regulation 7(2)',
    actualValue: `${data.registrationCategory} certifying ${data.phaseConfiguration}`,
    expectedValue: 'installation_electrician or master_installation_electrician for 3-phase',
  };
}

function checkInsulationResistance(test: COCTestReport): COCRuleResult {
  if (test.insulationResistance_MOhm === null) {
    return {
      ruleId: 'COC-003',
      ruleName: 'Insulation Resistance (IR)',
      passed: false,
      severity: 'CRITICAL',
      message: 'Insulation resistance not measured',
      reference: 'SANS 10142-1, Table 8.1',
      actualValue: 'Not measured',
      expectedValue: '> 1.0 MΩ',
    };
  }

  const passed = test.insulationResistance_MOhm > 1.0;
  return {
    ruleId: 'COC-003',
    ruleName: 'Insulation Resistance (IR)',
    passed,
    severity: 'CRITICAL',
    message: passed
      ? `Insulation resistance ${test.insulationResistance_MOhm} MΩ exceeds 1.0 MΩ minimum`
      : `Insulation resistance ${test.insulationResistance_MOhm} MΩ below minimum 1.0 MΩ threshold`,
    reference: 'SANS 10142-1, Table 8.1',
    actualValue: `${test.insulationResistance_MOhm} MΩ`,
    expectedValue: '> 1.0 MΩ',
  };
}

function checkEarthLoopImpedance(test: COCTestReport): COCRuleResult {
  if (test.earthLoopImpedance_Zs_Ohm === null) {
    return {
      ruleId: 'COC-004',
      ruleName: 'Earth Loop Impedance (Zs)',
      passed: false,
      severity: 'CRITICAL',
      message: 'Earth loop impedance not measured',
      reference: 'SANS 10142-1, Clause 8.4.3',
      actualValue: 'Not measured',
      expectedValue: '> 0 Ω, flag if > 1.67 Ω',
    };
  }

  if (test.earthLoopImpedance_Zs_Ohm <= 0) {
    return {
      ruleId: 'COC-004',
      ruleName: 'Earth Loop Impedance (Zs)',
      passed: false,
      severity: 'CRITICAL',
      message: `Earth loop impedance ${test.earthLoopImpedance_Zs_Ohm} Ω is invalid (must be > 0)`,
      reference: 'SANS 10142-1, Clause 8.4.3',
      actualValue: `${test.earthLoopImpedance_Zs_Ohm} Ω`,
      expectedValue: '> 0 Ω',
    };
  }

  const isHigh = test.earthLoopImpedance_Zs_Ohm > 1.67;
  return {
    ruleId: 'COC-004',
    ruleName: 'Earth Loop Impedance (Zs)',
    passed: !isHigh,
    severity: isHigh ? 'WARNING' : 'INFO',
    message: isHigh
      ? `Zs ${test.earthLoopImpedance_Zs_Ohm} Ω exceeds 1.67 Ω — Type B MCB may not trip within 0.4s at 230V`
      : `Earth loop impedance ${test.earthLoopImpedance_Zs_Ohm} Ω within acceptable range`,
    reference: 'SANS 10142-1, Clause 8.4.3; Type B MCB trip at 230V/0.4s',
    actualValue: `${test.earthLoopImpedance_Zs_Ohm} Ω`,
    expectedValue: '≤ 1.67 Ω for Type B MCB @ 230V',
  };
}

function checkRcdTripTime(test: COCTestReport): COCRuleResult {
  if (test.rcdTripTime_ms === null) {
    return {
      ruleId: 'COC-005',
      ruleName: 'RCD Trip Time',
      passed: false,
      severity: 'CRITICAL',
      message: 'RCD trip time not measured',
      reference: 'SANS 10142-1, Clause 8.7',
      actualValue: 'Not measured',
      expectedValue: `≤ 300 ms for ${test.rcdRatedCurrent_mA} mA device`,
    };
  }

  if (test.rcdTripTime_ms > 300) {
    return {
      ruleId: 'COC-005',
      ruleName: 'RCD Trip Time',
      passed: false,
      severity: 'CRITICAL',
      message: `RCD trip time ${test.rcdTripTime_ms} ms exceeds maximum 300 ms — device is non-functional`,
      reference: 'SANS 10142-1, Clause 8.7',
      actualValue: `${test.rcdTripTime_ms} ms`,
      expectedValue: '≤ 300 ms',
    };
  }

  if (test.rcdTripTime_ms > 200) {
    return {
      ruleId: 'COC-005',
      ruleName: 'RCD Trip Time',
      passed: true,
      severity: 'WARNING',
      message: `RCD trip time ${test.rcdTripTime_ms} ms within limit but approaching 300 ms threshold`,
      reference: 'SANS 10142-1, Clause 8.7',
      actualValue: `${test.rcdTripTime_ms} ms`,
      expectedValue: '≤ 300 ms (ideal < 200 ms)',
    };
  }

  return {
    ruleId: 'COC-005',
    ruleName: 'RCD Trip Time',
    passed: true,
    severity: 'INFO',
    message: `RCD trip time ${test.rcdTripTime_ms} ms within acceptable range`,
    reference: 'SANS 10142-1, Clause 8.7',
    actualValue: `${test.rcdTripTime_ms} ms`,
    expectedValue: '≤ 300 ms',
  };
}

function checkPSCC(test: COCTestReport): COCRuleResult {
  if (test.pscc_kA === null) {
    return {
      ruleId: 'COC-006',
      ruleName: 'Prospective Short-Circuit Current (PSCC)',
      passed: false,
      severity: 'CRITICAL',
      message: 'PSCC not measured',
      reference: 'SANS 10142-1, Clause 8.4.2',
      actualValue: 'Not measured',
      expectedValue: '> 0 kA',
    };
  }

  if (test.pscc_kA <= 0) {
    return {
      ruleId: 'COC-006',
      ruleName: 'Prospective Short-Circuit Current (PSCC)',
      passed: false,
      severity: 'CRITICAL',
      message: `PSCC ${test.pscc_kA} kA is invalid (must be > 0)`,
      reference: 'SANS 10142-1, Clause 8.4.2',
      actualValue: `${test.pscc_kA} kA`,
      expectedValue: '> 0 kA',
    };
  }

  const flagged = test.pscc_kA < 0.5 || test.pscc_kA > 25;
  return {
    ruleId: 'COC-006',
    ruleName: 'Prospective Short-Circuit Current (PSCC)',
    passed: !flagged,
    severity: flagged ? 'WARNING' : 'INFO',
    message: flagged
      ? `PSCC ${test.pscc_kA} kA is ${test.pscc_kA < 0.5 ? 'unusually low' : 'unusually high'} — requires manual review`
      : `PSCC ${test.pscc_kA} kA within normal range`,
    reference: 'SANS 10142-1, Clause 8.4.2',
    actualValue: `${test.pscc_kA} kA`,
    expectedValue: '0.5 – 25 kA typical range',
  };
}

function checkSignature(test: COCTestReport): COCRuleResult {
  const passed = test.hasSignature && test.signatureDate !== null;
  const reasons: string[] = [];
  if (!test.hasSignature) reasons.push('signature missing');
  if (test.signatureDate === null) reasons.push('signature date missing');

  return {
    ruleId: 'COC-007',
    ruleName: 'Signature & Date',
    passed,
    severity: 'CRITICAL',
    message: passed
      ? 'Certificate is signed and dated'
      : `Missing legally required ${reasons.join(' and ')}`,
    reference: 'OHS Act 85 of 1993, Regulation 7(5)',
    actualValue: passed ? `Signed on ${test.signatureDate}` : reasons.join(', '),
    expectedValue: 'Valid signature and date present',
  };
}

function checkSolarBESS(test: COCTestReport): COCRuleResult[] {
  const results: COCRuleResult[] = [];

  if (test.hasSolarPV) {
    const groundingOk = test.solarGroundingVerified === true;
    const syncOk = test.inverterSyncVerified === true;
    const passed = groundingOk && syncOk;
    const missing: string[] = [];
    if (!groundingOk) missing.push('solar grounding verification');
    if (!syncOk) missing.push('inverter sync verification');

    results.push({
      ruleId: 'COC-008a',
      ruleName: 'Solar PV Compliance',
      passed,
      severity: 'CRITICAL',
      message: passed
        ? 'Solar PV grounding and inverter sync verified'
        : `Solar PV: Missing ${missing.join(' and ')}`,
      reference: 'SANS 10142-1:2024, Clause 10 (Solar PV Installations)',
      actualValue: passed ? 'All verified' : missing.join(', '),
      expectedValue: 'solarGroundingVerified=true, inverterSyncVerified=true',
    });
  }

  if (test.hasBESS) {
    const passed = test.bessFireProtection === true;
    results.push({
      ruleId: 'COC-008b',
      ruleName: 'BESS Fire Protection',
      passed,
      severity: 'CRITICAL',
      message: passed
        ? 'BESS fire protection verified'
        : 'BESS fire protection not verified — mandatory per SANS 10142-1:2024',
      reference: 'SANS 10142-1:2024, Clause 11 (BESS)',
      actualValue: passed ? 'Verified' : 'Not verified',
      expectedValue: 'bessFireProtection=true',
    });
  }

  return results;
}

function checkSPD(test: COCTestReport): COCRuleResult {
  const passed = test.spdOperational === true;
  return {
    ruleId: 'COC-009',
    ruleName: 'Surge Protection Device (SPD)',
    passed,
    severity: 'CRITICAL',
    message: passed
      ? 'SPD operational and verified'
      : 'SPD not verified as operational — mandatory per SANS 10142-1:2024',
    reference: 'SANS 10142-1:2024, Clause 7.12',
    actualValue: test.spdOperational === null ? 'Not checked' : String(test.spdOperational),
    expectedValue: 'spdOperational=true',
  };
}

// ============================================
// Fraud Risk Scoring
// ============================================

function calculateFraudRisk(
  data: COCData,
  test: COCTestReport,
  failedRules: COCRuleResult[]
): { score: FraudRiskScore; reasons: string[] } {
  const reasons: string[] = [];
  let riskLevel = 0;

  // HIGH: Missing signature + missing test values
  const mandatoryNulls = [
    test.insulationResistance_MOhm,
    test.earthLoopImpedance_Zs_Ohm,
    test.rcdTripTime_ms,
    test.pscc_kA,
  ].filter((v) => v === null).length;

  if (!test.hasSignature && mandatoryNulls > 0) {
    riskLevel = Math.max(riskLevel, 3);
    reasons.push('Missing signature combined with missing test measurements');
  }

  // HIGH: All numeric test values suspiciously identical
  const numericValues = [
    test.insulationResistance_MOhm,
    test.earthLoopImpedance_Zs_Ohm,
    test.rcdTripTime_ms,
    test.pscc_kA,
    test.earthContinuity_Ohm,
  ].filter((v): v is number => v !== null);

  if (numericValues.length >= 3) {
    const allSame = numericValues.every((v) => v === numericValues[0]);
    if (allSame) {
      riskLevel = Math.max(riskLevel, 3);
      reasons.push(`All test values are identical (${numericValues[0]}) — highly suspicious`);
    }
  }

  // MEDIUM: Any single mandatory field missing
  if (mandatoryNulls === 1) {
    riskLevel = Math.max(riskLevel, 2);
    reasons.push('Single mandatory test field missing');
  }

  // MEDIUM: Values at exact threshold boundaries
  if (test.insulationResistance_MOhm === 1.0) {
    riskLevel = Math.max(riskLevel, 2);
    reasons.push('Insulation resistance at exact threshold boundary (1.0 MΩ)');
  }
  if (test.rcdTripTime_ms === 300) {
    riskLevel = Math.max(riskLevel, 2);
    reasons.push('RCD trip time at exact threshold boundary (300 ms)');
  }
  if (test.earthLoopImpedance_Zs_Ohm === 1.67) {
    riskLevel = Math.max(riskLevel, 2);
    reasons.push('Earth loop impedance at exact threshold boundary (1.67 Ω)');
  }

  if (reasons.length === 0) {
    reasons.push('All fields present and within normal ranges');
  }

  const score: FraudRiskScore =
    riskLevel >= 3 ? 'HIGH' : riskLevel >= 2 ? 'MEDIUM' : 'LOW';

  return { score, reasons };
}

// ============================================
// Main Validation Function
// ============================================

export function validateCOC(
  data: COCData,
  test: COCTestReport
): COCValidationResult {
  const allResults: COCRuleResult[] = [];

  // Run all rules
  allResults.push(checkIncompleteCertificate(test));
  allResults.push(checkIssuerCompetency(data));
  allResults.push(checkInsulationResistance(test));
  allResults.push(checkEarthLoopImpedance(test));
  allResults.push(checkRcdTripTime(test));
  allResults.push(checkPSCC(test));
  allResults.push(checkSignature(test));
  allResults.push(...checkSolarBESS(test));
  allResults.push(checkSPD(test));

  const passedRules = allResults.filter((r) => r.passed);
  const failedRules = allResults.filter((r) => !r.passed);

  // Determine status
  const hasCriticalFail = failedRules.some((r) => r.severity === 'CRITICAL');
  const hasWarnings = failedRules.some((r) => r.severity === 'WARNING');

  let status: COCStatus;
  if (hasCriticalFail) {
    status = 'INVALID';
  } else if (hasWarnings) {
    status = 'REQUIRES_REVIEW';
  } else {
    status = 'VALID';
  }

  // Fraud risk
  const { score: fraudRiskScore, reasons: fraudRiskReasons } =
    calculateFraudRisk(data, test, failedRules);

  return {
    status,
    passedRules,
    failedRules,
    fraudRiskScore,
    fraudRiskReasons,
    totalRulesChecked: allResults.length,
    validatedAt: new Date().toISOString(),
  };
}
