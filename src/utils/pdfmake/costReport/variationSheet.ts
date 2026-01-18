/**
 * Variation Sheet Builder for Cost Reports
 * 
 * Generates individual variation order sheets matching the TENANT ACCOUNT template
 * with cyan accent colors and professional formatting.
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { format } from 'date-fns';

// Cyan accent color matching template (RGB: 0, 174, 239)
const ACCENT_COLOR = '#00AEEF';
const ACCENT_RGB = [0, 174, 239] as [number, number, number];

interface VariationData {
  id: string;
  code: string;
  description: string;
  is_credit: boolean;
  tenants?: {
    shop_name: string;
    shop_number: string;
  };
}

interface VariationLineItem {
  line_number: number;
  description: string;
  comments?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
}

interface VariationSheetOptions {
  projectName: string;
  reportDate: string | Date;
  variation: VariationData;
  lineItems: VariationLineItem[];
}

/**
 * Build content for a single variation sheet
 */
export function buildVariationSheetContent(options: VariationSheetOptions): Content[] {
  const { projectName, reportDate, variation, lineItems } = options;
  const formattedDate = format(new Date(reportDate), 'dd-MMM-yy');
  
  const lineItemTotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const content: Content[] = [
    // Page break before each variation sheet
    { text: '', pageBreak: 'before' },
    
    // Top cyan accent bar
    {
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: 515,
          h: 3,
          color: ACCENT_COLOR,
        },
      ],
      margin: [0, 0, 0, 8] as Margins,
    },
    
    // Title - "TENANT ACCOUNT" in cyan
    {
      text: 'TENANT ACCOUNT',
      fontSize: 24,
      bold: true,
      color: ACCENT_COLOR,
      margin: [0, 0, 0, 5] as Margins,
    },
    
    // Bottom cyan accent bar under title
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1,
          lineColor: ACCENT_COLOR,
        },
      ],
      margin: [0, 0, 0, 10] as Margins,
    },
    
    // Header info box
    {
      table: {
        widths: ['auto', '*', 'auto', 'auto'],
        body: [
          [
            { text: 'PROJECT:', fontSize: 10, bold: true, border: [true, true, false, false] },
            { text: projectName, fontSize: 10, border: [false, true, false, false] },
            { text: 'DATE:', fontSize: 10, bold: true, border: [false, true, false, false] },
            { text: formattedDate, fontSize: 10, border: [false, true, true, false] },
          ],
          [
            { text: 'VARIATION ORDER NO.:', fontSize: 10, bold: true, border: [true, false, false, true] },
            { 
              text: variation.code, 
              fontSize: 10, 
              decoration: 'underline',
              border: [false, false, false, true] 
            },
            { text: 'REVISION:', fontSize: 10, bold: true, border: [false, false, false, true] },
            { text: '0', fontSize: 10, decoration: 'underline', border: [false, false, true, true] },
          ],
        ],
      },
      layout: {
        defaultBorder: true,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
      margin: [0, 0, 0, 6] as Margins,
    },
    
    // Two cyan accent bars below header
    {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 515, h: 4, color: ACCENT_COLOR },
        { type: 'rect', x: 0, y: 6, w: 515, h: 4, color: ACCENT_COLOR },
      ],
      margin: [0, 0, 0, 12] as Margins,
    },
  ];

  // Tenant name centered
  if (variation.tenants) {
    content.push({
      text: `${variation.tenants.shop_number} - ${variation.tenants.shop_name}`,
      fontSize: 11,
      bold: true,
      alignment: 'center',
      margin: [0, 0, 0, 12] as Margins,
    });
  }

  // Line Items Table
  if (lineItems.length > 0) {
    const tableBody: any[][] = [
      // Header row with cyan background
      [
        { text: 'NO', bold: true, fillColor: ACCENT_COLOR, color: '#FFFFFF', fontSize: 9, alignment: 'center' as const },
        { text: 'DESCRIPTION', bold: true, fillColor: ACCENT_COLOR, color: '#FFFFFF', fontSize: 9 },
        { text: 'COMMENTS/ DETAIL', bold: true, fillColor: ACCENT_COLOR, color: '#FFFFFF', fontSize: 9 },
        { text: 'QTY:', bold: true, fillColor: ACCENT_COLOR, color: '#FFFFFF', fontSize: 8, alignment: 'center' as const },
        { text: 'RATE:', bold: true, fillColor: ACCENT_COLOR, color: '#FFFFFF', fontSize: 8, alignment: 'right' as const },
        { text: 'AMOUNT:', bold: true, fillColor: ACCENT_COLOR, color: '#FFFFFF', fontSize: 8, alignment: 'right' as const },
      ],
      // Data rows
      ...lineItems.map(item => [
        { text: item.line_number.toString(), fontSize: 9, alignment: 'center' as const },
        { text: item.description || '-', fontSize: 9 },
        { text: item.comments || '', fontSize: 9 },
        { text: item.quantity?.toString() || '1', fontSize: 8, alignment: 'center' as const },
        { 
          text: `R${Number(item.rate || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
          fontSize: 8, 
          alignment: 'right' as const 
        },
        { 
          text: `R${Number(item.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
          fontSize: 8, 
          bold: true,
          alignment: 'right' as const 
        },
      ]),
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: [10, 44, '*', 14, 24, 28],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.2,
        vLineWidth: () => 0.2,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        paddingLeft: () => 3,
        paddingRight: () => 3,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
    });

    // Total section
    content.push(
      // Horizontal line above total
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.5,
            lineColor: '#000000',
          },
        ],
        margin: [0, 10, 0, 5] as Margins,
      },
      // Total row with cyan background for label
      {
        columns: [
          {
            width: '65%',
            table: {
              widths: ['*'],
              body: [
                [{ 
                  text: 'TOTAL ADDITIONAL WORKS EXCLUSIVE OF VAT', 
                  fontSize: 9, 
                  bold: true, 
                  color: '#FFFFFF',
                  fillColor: ACCENT_COLOR,
                  margin: [5, 5, 5, 5] as Margins,
                }],
              ],
            },
            layout: 'noBorders',
          },
          {
            width: '*',
            text: `R${lineItemTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            fontSize: 11,
            bold: true,
            alignment: 'right',
            margin: [0, 5, 5, 0] as Margins,
          },
        ],
      }
    );
  } else {
    content.push({
      text: 'No line items for this variation',
      fontSize: 10,
      italics: true,
      color: '#666666',
      margin: [0, 10, 0, 0] as Margins,
    });
  }

  return content;
}

/**
 * Build content for multiple variation sheets
 */
export function buildAllVariationSheetsContent(
  variations: VariationData[],
  lineItemsMap: Map<string, VariationLineItem[]>,
  projectName: string,
  reportDate: string | Date
): Content[] {
  const allContent: Content[] = [];
  
  variations.forEach((variation) => {
    const lineItems = lineItemsMap.get(variation.id) || [];
    const sheetContent = buildVariationSheetContent({
      projectName,
      reportDate,
      variation,
      lineItems,
    });
    allContent.push(...sheetContent);
  });
  
  return allContent;
}
