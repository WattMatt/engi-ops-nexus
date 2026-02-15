/**
 * Shared calculation utilities for cost reports to ensure consistency
 * between UI display and PDF exports.
 * Uses decimal.js for precise financial calculations to prevent rounding errors.
 */

import { add, subtract, divide, round, sum, decimal } from './decimalPrecision';

export interface CategoryTotal {
  id: string;
  code: string;
  description: string;
  originalBudget: number;
  previousReport: number;
  anticipatedFinal: number;
  percentageOfTotal: number;
  currentVariance: number;
  originalVariance: number;
}

export interface GrandTotals {
  originalBudget: number;
  previousReport: number;
  anticipatedFinal: number;
  currentVariance: number;
  originalVariance: number;
}

/**
 * Calculate category totals from categories, line items, and variations
 * Variations show R0 in Original Budget and Previous Report, full amount in Anticipated Final
 * Uses precise decimal arithmetic to prevent floating-point rounding errors.
 */
export function calculateCategoryTotals(
  categories: any[],
  lineItems: any[],
  variations: any[]
): CategoryTotal[] {
  // First pass: calculate totals without percentages
  const totalsWithoutPercentages = categories.map(category => {
    const isVariationsCategory = category.description?.toUpperCase().includes("VARIATION");
    
    if (isVariationsCategory) {
      // For variations category, sum from variations table using precise arithmetic
      const anticipatedFinal = round(
        sum(variations.map(v => v.amount || 0)),
        2
      );
      
      return {
        id: category.id,
        code: category.code,
        description: category.description,
        originalBudget: 0, // Variations show R0 in original budget
        previousReport: 0, // Variations show R0 in previous report
        anticipatedFinal, // Full variations amount in anticipated final
        percentageOfTotal: 0, // Will be calculated in second pass
        currentVariance: anticipatedFinal, // Variance = full amount (since previous was 0)
        originalVariance: anticipatedFinal // Variance = full amount (since original was 0)
      };
    } else {
      // For regular categories, sum line items using precise arithmetic
      const items = lineItems.filter(item => item.category_id === category.id);
      const originalBudget = round(sum(items.map(item => item.original_budget || 0)), 2);
      const previousReport = round(sum(items.map(item => item.previous_report || 0)), 2);
      const anticipatedFinal = round(sum(items.map(item => item.anticipated_final || 0)), 2);
      
      return {
        id: category.id,
        code: category.code,
        description: category.description,
        originalBudget,
        previousReport,
        anticipatedFinal,
        percentageOfTotal: 0, // Will be calculated in second pass
        currentVariance: round(subtract(anticipatedFinal, previousReport), 2),
        originalVariance: round(subtract(anticipatedFinal, originalBudget), 2)
      };
    }
  });

  // Calculate total original budget for percentage calculations
  const totalOriginalBudget = round(
    sum(totalsWithoutPercentages.map(cat => cat.originalBudget)),
    2
  );

  // Second pass: add percentage of total using precise division
  return totalsWithoutPercentages.map(cat => ({
    ...cat,
    percentageOfTotal: totalOriginalBudget > 0 
      ? round(divide(cat.originalBudget, totalOriginalBudget) * 100, 2)
      : 0
  }));
}

/**
 * Calculate grand totals from category totals using precise arithmetic
 */
export function calculateGrandTotals(categoryTotals: CategoryTotal[]): GrandTotals {
  return {
    originalBudget: round(sum(categoryTotals.map(cat => cat.originalBudget)), 2),
    previousReport: round(sum(categoryTotals.map(cat => cat.previousReport)), 2),
    anticipatedFinal: round(sum(categoryTotals.map(cat => cat.anticipatedFinal)), 2),
    currentVariance: round(sum(categoryTotals.map(cat => cat.currentVariance)), 2),
    originalVariance: round(sum(categoryTotals.map(cat => cat.originalVariance)), 2)
  };
}

/**
 * Compare two totals with a small tolerance for floating point errors
 */
export function totalsMatch(total1: number, total2: number, tolerance: number = 0.01): boolean {
  return Math.abs(total1 - total2) < tolerance;
}

/**
 * Validate that UI totals match PDF calculation totals
 */
export function validateTotals(uiTotals: GrandTotals, pdfTotals: GrandTotals): {
  isValid: boolean;
  mismatches: string[];
} {
  const mismatches: string[] = [];
  
  if (!totalsMatch(uiTotals.originalBudget, pdfTotals.originalBudget)) {
    mismatches.push(
      `Original Budget: UI shows R${uiTotals.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}, ` +
      `PDF would show R${pdfTotals.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
    );
  }
  
  if (!totalsMatch(uiTotals.previousReport, pdfTotals.previousReport)) {
    mismatches.push(
      `Previous Report: UI shows R${uiTotals.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}, ` +
      `PDF would show R${pdfTotals.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
    );
  }
  
  if (!totalsMatch(uiTotals.anticipatedFinal, pdfTotals.anticipatedFinal)) {
    mismatches.push(
      `Anticipated Final: UI shows R${uiTotals.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}, ` +
      `PDF would show R${pdfTotals.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
    );
  }
  
  if (!totalsMatch(uiTotals.currentVariance, pdfTotals.currentVariance)) {
    mismatches.push(
      `Current Variance: UI shows R${Math.abs(uiTotals.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}, ` +
      `PDF would show R${Math.abs(pdfTotals.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
    );
  }
  
  if (!totalsMatch(uiTotals.originalVariance, pdfTotals.originalVariance)) {
    mismatches.push(
      `Original Variance: UI shows R${Math.abs(uiTotals.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}, ` +
      `PDF would show R${Math.abs(pdfTotals.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
    );
  }
  
  return {
    isValid: mismatches.length === 0,
    mismatches
  };
}
