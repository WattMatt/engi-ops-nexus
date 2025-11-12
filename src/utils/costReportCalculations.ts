/**
 * Shared calculation utilities for cost reports to ensure consistency
 * between UI display and PDF exports.
 */

export interface CategoryTotal {
  id: string;
  code: string;
  description: string;
  originalBudget: number;
  previousReport: number;
  anticipatedFinal: number;
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
 */
export function calculateCategoryTotals(
  categories: any[],
  lineItems: any[],
  variations: any[]
): CategoryTotal[] {
  return categories.map(category => {
    const isVariationsCategory = category.description?.toUpperCase().includes("VARIATION");
    
    if (isVariationsCategory) {
      // For variations category, sum from variations table
      const anticipatedFinal = variations.reduce(
        (sum, v) => sum + Number(v.amount || 0),
        0
      );
      
      return {
        id: category.id,
        code: category.code,
        description: category.description,
        originalBudget: 0,
        previousReport: 0,
        anticipatedFinal,
        currentVariance: anticipatedFinal,
        originalVariance: anticipatedFinal
      };
    } else {
      // For regular categories, sum line items
      const items = lineItems.filter(item => item.category_id === category.id);
      const originalBudget = items.reduce((sum, item) => sum + Number(item.original_budget || 0), 0);
      const previousReport = items.reduce((sum, item) => sum + Number(item.previous_report || 0), 0);
      const anticipatedFinal = items.reduce((sum, item) => sum + Number(item.anticipated_final || 0), 0);
      
      return {
        id: category.id,
        code: category.code,
        description: category.description,
        originalBudget,
        previousReport,
        anticipatedFinal,
        currentVariance: anticipatedFinal - previousReport,
        originalVariance: anticipatedFinal - originalBudget
      };
    }
  });
}

/**
 * Calculate grand totals from category totals
 */
export function calculateGrandTotals(categoryTotals: CategoryTotal[]): GrandTotals {
  return categoryTotals.reduce((acc, cat) => ({
    originalBudget: acc.originalBudget + cat.originalBudget,
    previousReport: acc.previousReport + cat.previousReport,
    anticipatedFinal: acc.anticipatedFinal + cat.anticipatedFinal,
    currentVariance: acc.currentVariance + cat.currentVariance,
    originalVariance: acc.originalVariance + cat.originalVariance
  }), {
    originalBudget: 0,
    previousReport: 0,
    anticipatedFinal: 0,
    currentVariance: 0,
    originalVariance: 0
  });
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
