export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) {
    return 'R 0.00';
  }
  return `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(value: number | string | null | undefined, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  return num.toLocaleString('en-ZA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPercentage(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) {
    return '0%';
  }
  return `${num.toFixed(2)}%`;
}
