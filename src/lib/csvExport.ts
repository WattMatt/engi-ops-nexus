/**
 * Centralized CSV Export Utility
 * Provides consistent CSV generation and download across the application
 */

import { toast } from "sonner";

export interface CSVExportOptions {
  /** Filename without extension */
  filename: string;
  /** Include timestamp in filename (default: true) */
  includeTimestamp?: boolean;
  /** Success message to show (default: "Export completed successfully") */
  successMessage?: string;
  /** Custom date format function for timestamp */
  formatDate?: (date: Date) => string;
}

/**
 * Escape a cell value for CSV format
 */
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert a 2D array of data to CSV string
 */
export function arrayToCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerRow = headers.map(escapeCSVValue).join(',');
  const dataRows = rows.map(row => 
    row.map(escapeCSVValue).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download a CSV string as a file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a timestamped filename
 */
export function generateFilename(baseName: string, includeTimestamp = true): string {
  if (!includeTimestamp) return `${baseName}.csv`;
  const timestamp = new Date().toISOString().split('T')[0];
  return `${baseName}-${timestamp}.csv`;
}

/**
 * Export data to CSV with automatic download and toast notification
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string; formatter?: (value: T[keyof T], row: T) => string }[],
  options: CSVExportOptions
): boolean {
  if (!data || data.length === 0) {
    toast.error("No data to export");
    return false;
  }

  try {
    const headers = columns.map(col => col.header);
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.key];
        if (col.formatter) {
          return col.formatter(value, row);
        }
        return value;
      })
    );

    const csv = arrayToCSV(headers, rows as (string | number | null | undefined)[][]);
    const filename = generateFilename(options.filename, options.includeTimestamp ?? true);
    
    downloadCSV(csv, filename);
    toast.success(options.successMessage ?? "Export completed successfully");
    return true;
  } catch (error) {
    console.error('CSV export error:', error);
    toast.error("Failed to export CSV");
    return false;
  }
}

/**
 * Export raw headers and rows to CSV
 */
export function exportRawToCSV(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options: CSVExportOptions
): boolean {
  if (!rows || rows.length === 0) {
    toast.error("No data to export");
    return false;
  }

  try {
    const csv = arrayToCSV(headers, rows);
    const filename = generateFilename(options.filename, options.includeTimestamp ?? true);
    
    downloadCSV(csv, filename);
    toast.success(options.successMessage ?? "Export completed successfully");
    return true;
  } catch (error) {
    console.error('CSV export error:', error);
    toast.error("Failed to export CSV");
    return false;
  }
}
