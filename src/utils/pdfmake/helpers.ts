/**
 * PDFMake Helper Functions
 * Common utilities for building PDF documents
 */

import type { Content, ContentTable, ContentColumns, ContentStack, TDocumentDefinitions, Margins } from 'pdfmake/interfaces';
import { PDF_COLORS, FONT_SIZES, tableLayouts } from './styles';
import { STANDARD_MARGINS, mmToPoints } from './config';
import { format } from 'date-fns';

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
    throw error;
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
