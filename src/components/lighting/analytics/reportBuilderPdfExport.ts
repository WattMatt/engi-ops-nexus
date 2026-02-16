/**
 * Report Builder PDF Export — SVG engine
 */
import { svgPagesToDownload } from '@/utils/svg-pdf/svgToPdfEngine';
import { buildAnalyticsReportPdf } from '@/utils/svg-pdf/reportBuilderPdfBuilder';
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

export async function generateAnalyticsReportPDF(
  config: ReportConfig,
  data: ReportData
): Promise<void> {
  console.log('[AnalyticsReportPDF] Starting SVG generation...');

  const svgPages = buildAnalyticsReportPdf(config, data);

  const filename = `${config.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  console.log('[AnalyticsReportPDF] Downloading:', filename);
  await svgPagesToDownload(svgPages, { filename });
}
