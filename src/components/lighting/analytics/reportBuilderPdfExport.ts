/**
 * Report Builder PDF Export - Migrated to pdfmake canonical pattern
 * 
 * Replaces legacy jsPDF implementation with pdfmake.
 */

import {
  createDocument,
  heading,
  paragraph,
  dataTable,
  spacer,
  buildMetricCard,
  formatCurrency,
  PDF_COLORS,
  SPACING,
  type Content,
  type TableColumn,
} from '@/utils/pdfmake';
import { format } from 'date-fns';

export interface ReportData {
  fittings: any[] | null;
  schedules: any[] | null;
  projects: { id: string; name: string }[] | null;
}

export interface ReportConfig {
  name: string;
  timeframe: 'all' | '12months' | '6months' | '3months';
  metrics: {
    portfolio: boolean;
    benchmarks: boolean;
    trends: boolean;
    manufacturers: boolean;
    efficiency: boolean;
    costs: boolean;
  };
}

/**
 * Build portfolio summary section
 */
function buildPortfolioSummary(data: ReportData): Content[] {
  if (!data.fittings || data.fittings.length === 0) {
    return [];
  }

  const totalFittings = data.fittings.length;
  const totalCost = data.fittings.reduce(
    (s, f) => s + (f.supply_cost || 0) + (f.install_cost || 0),
    0
  );
  const avgWattage = totalFittings
    ? data.fittings.reduce((s, f) => s + (f.wattage || 0), 0) / totalFittings
    : 0;

  const columns: TableColumn[] = [
    { header: 'Metric', field: 'metric', width: '*' },
    { header: 'Value', field: 'value', width: 150, align: 'right' },
  ];

  const tableData = [
    { metric: 'Total Fittings', value: totalFittings.toString() },
    { metric: 'Total Portfolio Value', value: formatCurrency(totalCost) },
    { metric: 'Average Wattage', value: `${avgWattage.toFixed(1)} W` },
    { metric: 'Unique Projects', value: (data.projects?.length || 0).toString() },
  ];

  return [
    heading('Portfolio Summary', 2),
    dataTable(columns, tableData, { layout: 'zebra' }),
    spacer(SPACING.lg),
  ];
}

/**
 * Build manufacturer analysis section
 */
function buildManufacturerAnalysis(data: ReportData): Content[] {
  if (!data.fittings || data.fittings.length === 0) {
    return [];
  }

  const mfrCounts: Record<string, number> = {};
  data.fittings.forEach((f) => {
    if (f.manufacturer) {
      mfrCounts[f.manufacturer] = (mfrCounts[f.manufacturer] || 0) + 1;
    }
  });

  const mfrData = Object.entries(mfrCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([mfr, count]) => ({
      manufacturer: mfr,
      count: count.toString(),
      share: `${((count / data.fittings!.length) * 100).toFixed(1)}%`,
    }));

  const columns: TableColumn[] = [
    { header: 'Manufacturer', field: 'manufacturer', width: '*' },
    { header: 'Fitting Count', field: 'count', width: 100, align: 'center' },
    { header: 'Market Share', field: 'share', width: 100, align: 'right' },
  ];

  return [
    heading('Manufacturer Analysis', 2),
    dataTable(columns, mfrData, { layout: 'zebra' }),
    spacer(SPACING.lg),
  ];
}

/**
 * Build efficiency analysis section
 */
function buildEfficiencyAnalysis(data: ReportData): Content[] {
  if (!data.fittings || data.fittings.length === 0) {
    return [];
  }

  const efficacyFittings = data.fittings.filter((f) => f.wattage && f.lumen_output);

  if (efficacyFittings.length === 0) {
    return [];
  }

  const efficacyRanges: Record<string, number> = {
    'Below 80 lm/W': 0,
    '80-100 lm/W': 0,
    '100-120 lm/W': 0,
    'Above 120 lm/W': 0,
  };

  efficacyFittings.forEach((f) => {
    const eff = f.lumen_output! / f.wattage!;
    if (eff < 80) efficacyRanges['Below 80 lm/W']++;
    else if (eff < 100) efficacyRanges['80-100 lm/W']++;
    else if (eff < 120) efficacyRanges['100-120 lm/W']++;
    else efficacyRanges['Above 120 lm/W']++;
  });

  const effData = Object.entries(efficacyRanges).map(([range, count]) => ({
    range,
    count: count.toString(),
    percentage: `${((count / efficacyFittings.length) * 100).toFixed(1)}%`,
  }));

  const columns: TableColumn[] = [
    { header: 'Efficacy Range', field: 'range', width: '*' },
    { header: 'Count', field: 'count', width: 80, align: 'center' },
    { header: 'Percentage', field: 'percentage', width: 100, align: 'right' },
  ];

  return [
    heading('Efficiency Analysis', 2),
    dataTable(columns, effData, { layout: 'zebra' }),
    spacer(SPACING.lg),
  ];
}

/**
 * Generate the analytics report PDF
 */
export async function generateAnalyticsReportPDF(
  config: ReportConfig,
  data: ReportData
): Promise<void> {
  console.log('[AnalyticsReportPDF] Starting generation...');

  const doc = createDocument({
    orientation: 'portrait',
    pageSize: 'A4',
  });

  // Title
  doc.add(heading(config.name, 1));
  doc.add(paragraph(`Generated: ${format(new Date(), 'PPP')}`));
  doc.add(spacer(SPACING.lg));

  // Add sections based on config
  if (config.metrics.portfolio) {
    doc.add(buildPortfolioSummary(data));
  }

  if (config.metrics.manufacturers) {
    doc.add(buildManufacturerAnalysis(data));
  }

  if (config.metrics.efficiency) {
    doc.add(buildEfficiencyAnalysis(data));
  }

  // Header and footer
  doc.withStandardHeader(config.name);
  doc.withStandardFooter(false);

  // Download with dynamic filename
  const filename = `${config.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  console.log('[AnalyticsReportPDF] Downloading:', filename);
  await doc.download(filename);
}
