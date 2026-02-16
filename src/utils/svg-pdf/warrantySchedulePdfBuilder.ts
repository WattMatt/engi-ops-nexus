/**
 * Warranty Schedule SVG PDF Builder
 * Replaces legacy jsPDF-based warranty generation in LightingHandoverGenerator
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  applyRunningHeaders, applyPageFooters, addPageHeader, buildTablePages,
  PAGE_W, PAGE_H, MARGIN_LEFT, MARGIN_TOP, MARGIN_BOTTOM,
  CONTENT_W, BRAND_PRIMARY, TEXT_DARK, TEXT_MUTED, WHITE, BORDER_COLOR,
  type StandardCoverPageData, type TableColumn,
} from './sharedSvgHelpers';

export interface WarrantyFitting {
  fittingCode: string;
  modelName: string;
  manufacturer: string;
  quantity: number;
  warrantyYears: number;
  warrantyTerms: string;
}

export interface WarrantySchedulePdfData {
  coverData: StandardCoverPageData;
  projectName: string;
  fittings: WarrantyFitting[];
}

export function buildWarrantySchedulePdf(data: WarrantySchedulePdfData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];

  // 1. Cover
  pages.push(buildStandardCoverPageSvg(data.coverData));

  // 2. Warranty table
  const cols: TableColumn[] = [
    { header: 'Code', width: 22, key: 'code' },
    { header: 'Model', width: 35, key: 'model' },
    { header: 'Manufacturer', width: 28, key: 'mfr' },
    { header: 'Qty', width: 12, align: 'center', key: 'qty' },
    { header: 'Warranty', width: 20, align: 'center', key: 'warranty' },
    { header: 'Terms', width: 45, key: 'terms' },
  ];

  const rows = data.fittings.map(f => ({
    code: f.fittingCode,
    model: f.modelName,
    mfr: f.manufacturer,
    qty: String(f.quantity),
    warranty: `${f.warrantyYears} years`,
    terms: f.warrantyTerms,
  }));

  pages.push(...buildTablePages('Warranty Schedule', cols, rows));

  // Add footnote to last page
  const lastPage = pages[pages.length - 1];
  textEl(lastPage, MARGIN_LEFT, PAGE_H - MARGIN_BOTTOM - 4,
    'Note: Warranty periods commence from date of installation. Contact supplier for warranty claims.',
    { size: 2.5, fill: TEXT_MUTED });

  applyRunningHeaders(pages, 'Warranty Schedule', data.projectName);
  applyPageFooters(pages, 'Warranty Schedule');

  return pages;
}
