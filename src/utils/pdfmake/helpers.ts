/**
 * PDFMake Helper Functions
 * Common utilities for building PDF documents
 * 
 * Key utilities:
 * - Text helpers: heading, paragraph, keyValue, sectionHeader
 * - Table helpers: dataTable, infoTable
 * - Layout helpers: twoColumns, stack, horizontalLine, spacer
 * - Panel helpers: buildPanel for styled cards/boxes
 * - Margin helpers: m, mx, my, mt, mb (re-exported from styles)
 */

import type { Content, ContentTable, ContentColumns, ContentStack, TDocumentDefinitions, Margins } from 'pdfmake/interfaces';
import { PDF_COLORS, FONT_SIZES, SPACING, tableLayouts, m, mx, my, mt, mb, ml, mr } from './styles';
import { STANDARD_MARGINS, mmToPoints } from './config';
import { format } from 'date-fns';

// Re-export margin utilities for convenience
export { m, mx, my, mt, mb, ml, mr } from './styles';

// ============ Text Helpers ============

/**
 * Create a styled heading
 */
export const heading = (text: string, level: 1 | 2 | 3 = 1): Content => ({
  text,
  style: `h${level}`,
});

/**
 * Create body text with optional styling
 */
export const paragraph = (text: string, options?: { bold?: boolean; italics?: boolean; color?: string }): Content => ({
  text,
  style: 'body',
  ...options,
});

/**
 * Create a key-value pair display
 */
export const keyValue = (label: string, value: string | number, options?: { 
  labelWidth?: number;
  inline?: boolean;
}): Content => {
  const { labelWidth = 80, inline = true } = options || {};
  
  if (inline) {
    return {
      columns: [
        { text: `${label}:`, style: 'label', width: labelWidth },
        { text: String(value), style: 'value' },
      ],
      columnGap: 8,
      margin: [0, 2, 0, 2] as Margins,
    };
  }
  
  return {
    stack: [
      { text: label, style: 'label' },
      { text: String(value), style: 'value', margin: [0, 2, 0, 0] as Margins },
    ],
    margin: [0, 0, 0, 6] as Margins,
  };
};

/**
 * Create a section header with underline
 */
export const sectionHeader = (text: string): Content => ({
  stack: [
    { text, style: 'h2' },
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 200,
          y2: 0,
          lineWidth: 1,
          lineColor: PDF_COLORS.primary,
        },
      ],
      margin: [0, 0, 0, 10] as Margins,
    },
  ],
});

// ============ Table Helpers ============

export interface TableColumn {
  header: string;
  field: string;
  width?: number | string | '*';
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

/**
 * Create a standard data table
 */
export const dataTable = (
  columns: TableColumn[],
  data: Record<string, any>[],
  options?: {
    layout?: keyof typeof tableLayouts | 'lightHorizontalLines';
    headerBackground?: string;
    zebraStripe?: boolean;
  }
): ContentTable => {
  const { layout = 'zebra', headerBackground = PDF_COLORS.textMuted } = options || {};
  
  // Build header row
  const headerRow = columns.map(col => ({
    text: col.header,
    style: 'tableHeader',
    alignment: col.align || 'left',
    fillColor: headerBackground,
  }));
  
  // Build data rows
  const dataRows = data.map(row => 
    columns.map(col => ({
      text: col.format ? col.format(row[col.field]) : String(row[col.field] ?? ''),
      style: 'tableCell',
      alignment: col.align || 'left',
    }))
  );
  
  return {
    layout: typeof layout === 'string' && layout in tableLayouts 
      ? tableLayouts[layout as keyof typeof tableLayouts] 
      : layout,
    table: {
      headerRows: 1,
      widths: columns.map(col => col.width || '*'),
      body: [headerRow, ...dataRows],
    },
  };
};

/**
 * Create a simple two-column info table (label-value pairs)
 */
export const infoTable = (
  data: Array<{ label: string; value: string | number }>,
  options?: { labelWidth?: number | string }
): ContentTable => {
  const { labelWidth = 120 } = options || {};
  
  return {
    layout: 'noBorders',
    table: {
      widths: [labelWidth, '*'],
      body: data.map(({ label, value }) => [
        { text: `${label}:`, style: 'label' },
        { text: String(value), style: 'value' },
      ]),
    },
  };
};

// ============ Layout Helpers ============

/**
 * Create a two-column layout
 */
export const twoColumns = (
  left: Content,
  right: Content,
  options?: { gap?: number; leftWidth?: number | string }
): ContentColumns => ({
  columns: [
    { width: options?.leftWidth || '*', ...wrapContent(left) },
    { width: '*', ...wrapContent(right) },
  ],
  columnGap: options?.gap || 20,
});

/**
 * Create a stack of content items
 */
export const stack = (items: Content[], spacing?: number): ContentStack => ({
  stack: items,
  margin: spacing ? [0, 0, 0, spacing] as Margins : undefined,
});

/**
 * Add a horizontal line
 */
export const horizontalLine = (options?: { 
  color?: string; 
  width?: number;
  margin?: Margins;
}): Content => ({
  canvas: [
    {
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 515, // A4 width minus margins
      y2: 0,
      lineWidth: options?.width || 0.5,
      lineColor: options?.color || PDF_COLORS.border,
    },
  ],
  margin: options?.margin || [0, 10, 0, 10] as Margins,
});

/**
 * Add vertical spacing
 */
export const spacer = (height: number = 10): Content => ({
  text: '',
  margin: [0, height, 0, 0] as Margins,
});

// ============ Image Helpers ============

/**
 * Convert image URL to base64 data URL
 */
export const imageToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('Image blob is empty');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result || result.length < 50) {
          reject(new Error('Invalid image data'));
        } else {
          resolve(result);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    // Return a 1x1 transparent pixel to prevent PDF crash if image fails
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
};

/**
 * Create an image content object
 */
export const image = (
  dataUrl: string,
  options?: {
    width?: number;
    height?: number;
    fit?: [number, number];
    alignment?: 'left' | 'center' | 'right';
  }
): Content => ({
  image: dataUrl,
  ...options,
});

// ============ Page Helpers ============

/**
 * Create a page break
 */
export const pageBreak = (): Content => ({
  text: '',
  pageBreak: 'after',
});

/**
 * Create content that forces a new page before it
 */
export const newPage = (content: Content): Content => ({
  ...wrapContent(content),
  pageBreak: 'before',
});

// ============ Utility Functions ============

/**
 * Wrap simple text/content into proper Content object
 */
const wrapContent = (content: Content): any => {
  if (typeof content === 'string') {
    return { text: content };
  }
  if (Array.isArray(content)) {
    return { stack: content };
  }
  return content;
};

/**
 * Format currency value
 */
export const formatCurrency = (value: number, currency: string = 'R'): string => {
  return `${currency} ${value.toLocaleString('en-ZA', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Format date
 */
export const formatDate = (date: Date | string, formatStr: string = 'dd MMMM yyyy'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// ============ Panel/Card Helpers ============

export interface PanelOptions {
  fillColor?: string;
  borderColor?: string;
  indicatorColor?: string;
  titleFillColor?: string;
  margin?: Margins;
}

/**
 * Create a styled panel/card with title and content
 * Useful for info boxes, highlighted sections, etc.
 */
export const buildPanel = (
  title: string,
  contentNodes: Content | Content[],
  options?: PanelOptions
): Content => {
  const {
    fillColor,
    borderColor = PDF_COLORS.border,
    titleFillColor = PDF_COLORS.backgroundAlt,
    margin = [0, SPACING.md, 0, 0] as Margins,
  } = options || {};

  const contentArray = Array.isArray(contentNodes) ? contentNodes : [contentNodes];

  return {
    table: {
      widths: ['*'],
      body: [
        [{ 
          text: title, 
          style: ['heading', 'h3'],
          fillColor: titleFillColor,
          margin: [SPACING.sm, SPACING.xs, SPACING.sm, SPACING.xs] as Margins,
        }],
        [{ 
          stack: contentArray, 
          margin: [SPACING.sm, SPACING.sm, SPACING.sm, SPACING.sm] as Margins,
          fillColor,
        }],
      ],
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 0.5 : 0,
      vLineWidth: () => 0.5,
      hLineColor: () => borderColor,
      vLineColor: () => borderColor,
    },
    margin,
  };
};

/**
 * Create a simple info box with background
 */
export const buildInfoBox = (
  content: Content | Content[],
  options?: { 
    fillColor?: string; 
    borderColor?: string;
    margin?: Margins;
  }
): Content => {
  const {
    fillColor = PDF_COLORS.background,
    borderColor = PDF_COLORS.border,
    margin = [0, SPACING.sm, 0, SPACING.sm] as Margins,
  } = options || {};

  const contentArray = Array.isArray(content) ? content : [content];

  return {
    table: {
      widths: ['*'],
      body: [[{ 
        stack: contentArray, 
        fillColor,
        margin: [SPACING.sm, SPACING.sm, SPACING.sm, SPACING.sm] as Margins,
      }]],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => borderColor,
      vLineColor: () => borderColor,
    },
    margin,
  };
};

/**
 * Create a status badge
 */
export const buildStatusBadge = (
  text: string,
  status: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
): Content => {
  const colors = {
    success: { bg: PDF_COLORS.successLight || '#dcfce7', text: PDF_COLORS.success },
    warning: { bg: PDF_COLORS.warningLight || '#fef3c7', text: PDF_COLORS.warning },
    danger: { bg: PDF_COLORS.dangerLight || '#fee2e2', text: PDF_COLORS.danger },
    info: { bg: PDF_COLORS.primaryLight || '#dbeafe', text: PDF_COLORS.info || PDF_COLORS.primary },
    neutral: { bg: PDF_COLORS.background, text: PDF_COLORS.textMuted },
  };

  const colorSet = colors[status];

  return {
    table: {
      body: [[{
        text,
        fontSize: FONT_SIZES.xs,
        bold: true,
        color: colorSet.text,
        fillColor: colorSet.bg,
        margin: [4, 2, 4, 2] as Margins,
      }]],
    },
    layout: 'noBorders',
  };
};

/**
 * Create a metric card for KPI display
 */
export const buildMetricCard = (
  value: string | number,
  label: string,
  options?: {
    valueColor?: string;
    width?: number | string;
    accentColor?: string;
  }
): Content => {
  const { valueColor = PDF_COLORS.primary } = options || {};

  return {
    stack: [
      { 
        text: String(value), 
        fontSize: FONT_SIZES.display, 
        bold: true, 
        color: valueColor, 
        alignment: 'center' as const,
      },
      { 
        text: label, 
        fontSize: FONT_SIZES.sm, 
        color: PDF_COLORS.textMuted, 
        alignment: 'center' as const,
        margin: [0, 2, 0, 0] as Margins,
      },
    ],
  };
};

/**
 * Map priority to status badge variant
 */
export const priorityToStatus = (priority: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return map[priority?.toLowerCase()] || 'neutral';
};
