/**
 * Shared Executive Summary table configuration
 * Used by both UI and PDF export to ensure consistency
 */

export interface ExecutiveSummaryRow {
  code: string;
  description: string;
  originalBudget: number;
  previousReport: number;
  anticipatedFinal: number;
  percentOfTotal: string;
  currentVariance: number;
  originalVariance: number;
}

export interface ExecutiveSummaryTableData {
  headers: string[];
  categoryRows: ExecutiveSummaryRow[];
  grandTotalRow: ExecutiveSummaryRow;
}

/**
 * Generate executive summary table data from category totals
 */
export const generateExecutiveSummaryTableData = (
  categoryTotals: any[],
  grandTotals: any
): ExecutiveSummaryTableData => {
  // Calculate total anticipated final for percentages
  const totalAnticipatedFinal = categoryTotals.reduce(
    (sum, cat) => sum + cat.anticipatedFinal,
    0
  );

  // Generate category rows
  const categoryRows: ExecutiveSummaryRow[] = categoryTotals.map((cat) => {
    const percentage = totalAnticipatedFinal > 0
      ? ((cat.anticipatedFinal / totalAnticipatedFinal) * 100).toFixed(1)
      : '0.0';

    return {
      code: cat.code,
      description: cat.description,
      originalBudget: cat.originalBudget,
      previousReport: cat.previousReport,
      anticipatedFinal: cat.anticipatedFinal,
      percentOfTotal: `${percentage}%`,
      currentVariance: cat.currentVariance,
      originalVariance: cat.originalVariance,
    };
  });

  // Generate grand total row
  const grandTotalRow: ExecutiveSummaryRow = {
    code: '',
    description: 'GRAND TOTAL',
    originalBudget: grandTotals.originalBudget,
    previousReport: grandTotals.previousReport,
    anticipatedFinal: grandTotals.anticipatedFinal,
    percentOfTotal: '100.0%',
    currentVariance: grandTotals.currentVariance,
    originalVariance: grandTotals.originalVariance,
  };

  return {
    headers: [
      'CODE',
      'CATEGORY',
      'ORIGINAL BUDGET',
      'PREVIOUS REPORT',
      'ANTICIPATED FINAL',
      '% OF TOTAL',
      'CURRENT VARIANCE',
      'ORIGINAL VARIANCE',
    ],
    categoryRows,
    grandTotalRow,
  };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
};

/**
 * Format variance with sign
 */
export const formatVariance = (variance: number): string => {
  const sign = variance >= 0 ? '+' : '';
  return `${sign}R${Math.abs(variance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
};
