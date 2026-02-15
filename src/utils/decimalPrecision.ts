import Decimal from 'decimal.js';

// Configure Decimal.js for financial/engineering calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 21,
});

/**
 * Precise decimal arithmetic for cost reports and cable schedule calculations.
 * Prevents floating-point rounding errors that could cause engineering liability issues.
 */

export function add(...values: (number | string | null | undefined)[]): number {
  return values
    .reduce((acc, val) => {
      if (val === null || val === undefined) return acc;
      return acc.plus(new Decimal(val));
    }, new Decimal(0))
    .toNumber();
}

export function subtract(a: number | string, b: number | string): number {
  return new Decimal(a).minus(new Decimal(b)).toNumber();
}

export function multiply(...values: (number | string)[]): number {
  if (values.length === 0) return 0;
  return values
    .reduce((acc, val) => acc.times(new Decimal(val)), new Decimal(1))
    .toNumber();
}

export function divide(a: number | string, b: number | string, decimalPlaces = 10): number {
  if (new Decimal(b).isZero()) {
    console.warn('Division by zero attempted');
    return 0;
  }
  return new Decimal(a).dividedBy(new Decimal(b)).toDecimalPlaces(decimalPlaces).toNumber();
}

export function percentage(value: number | string, percent: number | string): number {
  return new Decimal(value).times(new Decimal(percent)).dividedBy(100).toNumber();
}

export function round(value: number | string, decimalPlaces = 2): number {
  return new Decimal(value).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toNumber();
}

export function sum(values: (number | string | null | undefined)[]): number {
  return values
    .filter((v): v is number | string => v !== null && v !== undefined && v !== '')
    .reduce((acc, val) => acc.plus(new Decimal(val)), new Decimal(0))
    .toNumber();
}

/**
 * Format currency with proper precision
 */
export function formatCurrencyPrecise(value: number | string | null | undefined, currencySymbol = 'R'): string {
  if (value === null || value === undefined) return `${currencySymbol} 0.00`;
  const rounded = round(value, 2);
  return `${currencySymbol} ${rounded.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Calculate percentage with precision
 */
export function calculatePercentage(part: number | string, whole: number | string): number {
  if (new Decimal(whole).isZero()) return 0;
  return new Decimal(part).dividedBy(new Decimal(whole)).times(100).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate variance (difference between two values)
 */
export function calculateVariance(actual: number | string, budget: number | string): number {
  return new Decimal(actual).minus(new Decimal(budget)).toNumber();
}

/**
 * Calculate voltage drop with precision (for cable sizing)
 */
export function calculateVoltageDrop(
  current: number,
  length: number,
  resistance: number,
  voltage: number
): number {
  // Voltage drop formula: Vd = (I × L × R × 2) / 1000
  // where: I = current (A), L = length (m), R = resistance (Ω/km)
  const drop = new Decimal(current)
    .times(new Decimal(length))
    .times(new Decimal(resistance))
    .times(2)
    .dividedBy(1000);
  
  // Return as percentage of supply voltage
  return drop.dividedBy(new Decimal(voltage)).times(100).toDecimalPlaces(4).toNumber();
}

/**
 * Calculate cable cost with precision
 */
export function calculateCableCost(
  length: number,
  supplyRatePerMeter: number,
  installRatePerMeter: number,
  terminationCostPerEnd: number,
  quantity = 1
): { supply: number; install: number; termination: number; total: number } {
  const supply = new Decimal(length).times(supplyRatePerMeter).times(quantity);
  const install = new Decimal(length).times(installRatePerMeter).times(quantity);
  const termination = new Decimal(terminationCostPerEnd).times(2).times(quantity); // 2 ends per cable

  return {
    supply: supply.toDecimalPlaces(2).toNumber(),
    install: install.toDecimalPlaces(2).toNumber(),
    termination: termination.toDecimalPlaces(2).toNumber(),
    total: supply.plus(install).plus(termination).toDecimalPlaces(2).toNumber(),
  };
}

/**
 * Create a Decimal instance for complex calculations
 */
export function decimal(value: number | string): Decimal {
  return new Decimal(value);
}

export { Decimal };
