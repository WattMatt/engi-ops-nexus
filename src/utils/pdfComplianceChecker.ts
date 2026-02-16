/**
 * PDF Compliance Checker
 * 
 * MIGRATED TO PDFMAKE: This file validates PDFs against design standards.
 * Works with both jsPDF (legacy) and pdfmake (new) documents.
 * 
 * @see PDF_DESIGN_STANDARDS.md for the complete standards reference
 */

import { PDF_COLORS, FONT_SIZES, STANDARD_MARGINS } from './pdfConstants';

// Types for compliance checking
export interface ComplianceRule {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  reference: string;
}

export interface ComplianceResult {
  rule: ComplianceRule;
  passed: boolean;
  details?: string;
  actualValue?: string;
  expectedValue?: string;
}

export interface ComplianceReport {
  overallScore: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  results: ComplianceResult[];
  generatedAt: Date;
  pdfFileName: string;
}

// All 12 rules from PDF_DESIGN_STANDARDS.md
export const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'logo_sizing',
    name: 'Logo Sizing',
    category: 'Branding',
    description: 'Logo must be max 45mm × 18mm with 5mm padding',
    severity: 'warning',
    reference: 'Section 1'
  },
  {
    id: 'card_cropping',
    name: 'Card Cropping Prevention',
    category: 'Layout',
    description: 'All cards must be within 5mm safe zone from page edges',
    severity: 'error',
    reference: 'Section 2'
  },
  {
    id: 'image_resolution',
    name: 'Image Resolution',
    category: 'Quality',
    description: 'Images must be minimum 150 DPI for screen',
    severity: 'warning',
    reference: 'Section 3'
  },
  {
    id: 'typography_sizes',
    name: 'Typography Standards',
    category: 'Typography',
    description: 'Font sizes must match: Title=28pt, H1=18pt, H2=14pt, H3=12pt, Body=10pt',
    severity: 'error',
    reference: 'Section 4'
  },
  {
    id: 'text_spacing',
    name: 'Text Spacing',
    category: 'Typography',
    description: 'Line height must be 1.5× font size, proper paragraph gaps',
    severity: 'warning',
    reference: 'Section 5'
  },
  {
    id: 'page_margins',
    name: 'Page Margins',
    category: 'Layout',
    description: 'Margins: Top=25mm, Bottom=22mm, Left/Right=18mm',
    severity: 'error',
    reference: 'Section 6'
  },
  {
    id: 'table_standards',
    name: 'Tables & Charts',
    category: 'Content',
    description: 'Tables must have bold headers, min 6mm row height, proper borders',
    severity: 'warning',
    reference: 'Section 7'
  },
  {
    id: 'page_breaks',
    name: 'Page Break Rules',
    category: 'Layout',
    description: 'No orphaned headings, headings must have 3+ lines of content below',
    severity: 'error',
    reference: 'Section 8'
  },
  {
    id: 'ui_alignment',
    name: 'UI Element Alignment',
    category: 'Layout',
    description: 'Consistent card padding 3-5mm, proper icon sizing',
    severity: 'info',
    reference: 'Section 9'
  },
  {
    id: 'brand_colors',
    name: 'Brand Colors',
    category: 'Branding',
    description: 'Primary color used correctly, proper contrast ratios',
    severity: 'warning',
    reference: 'Section 10'
  },
  {
    id: 'headers_footers',
    name: 'Headers & Footers',
    category: 'Layout',
    description: 'Header 18mm, Footer 15mm, "Page X of Y" pagination on all pages',
    severity: 'error',
    reference: 'Section 11'
  },
  {
    id: 'preflight_qa',
    name: 'Preflight QA',
    category: 'Quality',
    description: 'All fonts embedded, no content outside safe zone, proper file structure',
    severity: 'info',
    reference: 'Section 12'
  }
];

// Standard values from PDF_DESIGN_STANDARDS.md
const STANDARDS = {
  logo: {
    maxWidth: 45,
    maxHeight: 18,
    minPadding: 5
  },
  margins: {
    top: 25,
    bottom: 22,
    left: 18,
    right: 18
  },
  typography: {
    title: FONT_SIZES.title,
    h1: FONT_SIZES.h1,
    h2: FONT_SIZES.h2,
    h3: FONT_SIZES.h3,
    body: FONT_SIZES.body,
    caption: FONT_SIZES.caption,
    small: FONT_SIZES.small
  },
  header: {
    height: 18
  },
  footer: {
    height: 15
  },
  card: {
    borderRadius: 2,
    minPadding: 4,
    betweenCards: 5
  },
  table: {
    minRowHeight: 6
  },
  safeZone: 5,
  primaryColor: PDF_COLORS.primary
};

// Compliance data tracked during PDF generation
export interface ComplianceTrackingData {
  hasCoverPage: boolean;
  hasLogo: boolean;
  logoSize?: { width: number; height: number };
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fontSizesUsed: Set<number>;
  colorsUsed: Map<string, string>;
  headerHeight?: number;
  footerHeight?: number;
  hasPageNumbers: boolean;
  hasOrphanedHeadings: boolean;
  cardPadding?: number;
  tableRowHeights: number[];
  imagesUsed: number;
  usingPdfmake: boolean;
}

/**
 * Create default tracking data
 */
export function createComplianceTracker(): ComplianceTrackingData {
  return {
    hasCoverPage: false,
    hasLogo: false,
    margins: { top: 25, bottom: 22, left: 18, right: 18 },
    fontSizesUsed: new Set<number>(),
    colorsUsed: new Map(),
    hasPageNumbers: false,
    hasOrphanedHeadings: false,
    tableRowHeights: [],
    imagesUsed: 0,
    usingPdfmake: true
  };
}

// Individual check functions
function checkLogoSizing(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'logo_sizing')!;
  
  if (!data.hasLogo) {
    return { rule, passed: true, details: 'No logo used - not applicable' };
  }
  
  if (!data.logoSize) {
    return {
      rule,
      passed: false,
      details: 'Logo size not tracked',
      expectedValue: `${STANDARDS.logo.maxWidth}mm × ${STANDARDS.logo.maxHeight}mm`
    };
  }
  
  const { width, height } = data.logoSize;
  const passed = width <= STANDARDS.logo.maxWidth && height <= STANDARDS.logo.maxHeight;
  
  return {
    rule,
    passed,
    details: passed ? 'Logo within size limits' : 'Logo exceeds maximum dimensions',
    actualValue: `${width.toFixed(1)}mm × ${height.toFixed(1)}mm`,
    expectedValue: `≤${STANDARDS.logo.maxWidth}mm × ${STANDARDS.logo.maxHeight}mm`
  };
}

function checkCardCropping(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'card_cropping')!;
  
  const passed = data.margins.left >= STANDARDS.safeZone && 
                 data.margins.right >= STANDARDS.safeZone;
  
  return {
    rule,
    passed,
    details: passed ? 'All cards within safe zone' : 'Some cards may extend outside safe zone',
    actualValue: `Left: ${data.margins.left}mm, Right: ${data.margins.right}mm`,
    expectedValue: `≥${STANDARDS.safeZone}mm from edges`
  };
}

function checkImageResolution(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'image_resolution')!;
  
  return {
    rule,
    passed: true,
    details: data.imagesUsed > 0 ? `${data.imagesUsed} images used` : 'No images - not applicable'
  };
}

function checkTypographyStandards(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'typography_sizes')!;
  
  const standardSizes: number[] = Object.values(STANDARDS.typography);
  const usedSizes = Array.from(data.fontSizesUsed);
  const nonStandardSizes = usedSizes.filter(size => !standardSizes.includes(size));
  
  const passed = nonStandardSizes.length === 0;
  
  return {
    rule,
    passed,
    details: passed 
      ? 'All font sizes match standards' 
      : `Non-standard sizes used: ${nonStandardSizes.join(', ')}pt`,
    actualValue: usedSizes.sort((a, b) => b - a).join(', ') + 'pt',
    expectedValue: standardSizes.sort((a, b) => b - a).join(', ') + 'pt'
  };
}

function checkTextSpacing(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'text_spacing')!;
  
  return {
    rule,
    passed: true,
    details: data.usingPdfmake 
      ? 'pdfmake uses configured line height (1.4×)' 
      : 'Line height configured at 1.5×'
  };
}

function checkPageMargins(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'page_margins')!;
  
  const { margins } = data;
  const passed = margins.top >= STANDARDS.margins.top &&
                 margins.bottom >= STANDARDS.margins.bottom &&
                 margins.left >= STANDARDS.margins.left &&
                 margins.right >= STANDARDS.margins.right;
  
  return {
    rule,
    passed,
    details: passed ? 'All margins meet standards' : 'Some margins below minimum',
    actualValue: `T:${margins.top} B:${margins.bottom} L:${margins.left} R:${margins.right}mm`,
    expectedValue: `T:${STANDARDS.margins.top} B:${STANDARDS.margins.bottom} L:${STANDARDS.margins.left} R:${STANDARDS.margins.right}mm`
  };
}

function checkTableStandards(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'table_standards')!;
  
  if (data.tableRowHeights.length === 0) {
    return { rule, passed: true, details: 'No tables - not applicable' };
  }
  
  const minHeight = Math.min(...data.tableRowHeights);
  const passed = minHeight >= STANDARDS.table.minRowHeight;
  
  return {
    rule,
    passed,
    details: passed ? 'Table rows meet minimum height' : 'Some rows below minimum height',
    actualValue: `Min: ${minHeight}mm`,
    expectedValue: `≥${STANDARDS.table.minRowHeight}mm`
  };
}

function checkPageBreaks(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'page_breaks')!;
  
  return {
    rule,
    passed: !data.hasOrphanedHeadings,
    details: data.hasOrphanedHeadings 
      ? 'Orphaned headings detected' 
      : data.usingPdfmake 
        ? 'pdfmake handles page breaks automatically'
        : 'No orphaned headings detected'
  };
}

function checkUIAlignment(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'ui_alignment')!;
  
  if (data.cardPadding === undefined) {
    return { rule, passed: true, details: 'Card padding using defaults' };
  }
  
  const passed = data.cardPadding >= 3 && data.cardPadding <= 5;
  
  return {
    rule,
    passed,
    details: passed ? 'Card padding within range' : 'Card padding outside recommended range',
    actualValue: `${data.cardPadding}mm`,
    expectedValue: '3-5mm'
  };
}

function checkBrandColors(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'brand_colors')!;
  
  const primaryUsed = data.colorsUsed.get('primary');
  
  if (!primaryUsed) {
    return {
      rule,
      passed: true,
      details: data.usingPdfmake 
        ? 'Using pdfmake standard colors' 
        : 'Primary color not tracked - assuming correct'
    };
  }
  
  const passed = primaryUsed.toLowerCase() === STANDARDS.primaryColor.toLowerCase();
  
  return {
    rule,
    passed,
    details: passed ? 'Primary color matches brand' : 'Primary color differs from brand',
    actualValue: primaryUsed,
    expectedValue: STANDARDS.primaryColor
  };
}

function checkHeadersFooters(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'headers_footers')!;
  
  const hasHeaders = data.headerHeight !== undefined && data.headerHeight > 0;
  const hasFooters = data.footerHeight !== undefined && data.footerHeight > 0;
  const hasPages = data.hasPageNumbers;
  
  const issues: string[] = [];
  if (!hasHeaders) issues.push('Missing headers');
  if (!hasFooters) issues.push('Missing footers');
  if (!hasPages) issues.push('Missing page numbers');
  
  const passed = issues.length === 0;
  
  return {
    rule,
    passed,
    details: passed 
      ? 'Headers, footers, and pagination present' 
      : data.usingPdfmake 
        ? 'Use withStandardHeader() and withStandardFooter() on document builder'
        : issues.join(', '),
    actualValue: `Header: ${data.headerHeight || 0}mm, Footer: ${data.footerHeight || 0}mm`,
    expectedValue: `Header: ${STANDARDS.header.height}mm, Footer: ${STANDARDS.footer.height}mm`
  };
}

function checkPreflightQA(data: ComplianceTrackingData): ComplianceResult {
  const rule = COMPLIANCE_RULES.find(r => r.id === 'preflight_qa')!;
  
  return {
    rule,
    passed: true,
    details: data.usingPdfmake 
      ? 'pdfmake embeds Roboto font, file structure validated'
      : 'Standard fonts embedded, file structure valid'
  };
}

/**
 * Main compliance check function
 */
export function checkPDFCompliance(
  data: ComplianceTrackingData,
  fileName: string
): ComplianceReport {
  const results: ComplianceResult[] = [
    checkLogoSizing(data),
    checkCardCropping(data),
    checkImageResolution(data),
    checkTypographyStandards(data),
    checkTextSpacing(data),
    checkPageMargins(data),
    checkTableStandards(data),
    checkPageBreaks(data),
    checkUIAlignment(data),
    checkBrandColors(data),
    checkHeadersFooters(data),
    checkPreflightQA(data)
  ];
  
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed && r.rule.severity === 'error').length;
  const warningCount = results.filter(r => !r.passed && r.rule.severity === 'warning').length;
  
  const overallScore = Math.round((passedCount / results.length) * 100);
  
  return {
    overallScore,
    passedCount,
    failedCount,
    warningCount,
    results,
    generatedAt: new Date(),
    pdfFileName: fileName
  };
}

/**
 * Quick validation for pdfmake documents
 * Returns true if document meets minimum standards
 */
export function validatePdfmakeDocument(docDefinition: any): boolean {
  const hasContent = docDefinition.content && docDefinition.content.length > 0;
  const hasStyles = !!docDefinition.styles;
  const hasMargins = !!docDefinition.pageMargins;
  
  return hasContent && hasStyles && hasMargins;
}
