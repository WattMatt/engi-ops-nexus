/**
 * Detailed Line Items Builder for Cost Reports
 * 
 * Generates the detailed breakdown of line items by category
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { PDF_COLORS } from '../styles';

interface LineItem {
  id: string;
  description: string;
  original_budget?: number;
  previous_report?: number;
  anticipated_final?: number;
  notes?: string;
}

interface Category {
  id: string;
  code: string;
  description: string;
  display_order: number;
  cost_line_items?: LineItem[];
}

interface DetailedLineItemsOptions {
  categories: Category[];
}

/**
 * Build content for detailed line items section
 */
export function buildDetailedLineItemsContent(options: DetailedLineItemsOptions): Content[] {
  const { categories } = options;
  
  const content: Content[] = [
    // Section header
    {
      text: 'DETAILED LINE ITEMS',
      fontSize: 16,
      bold: true,
      alignment: 'center' as const,
      margin: [0, 0, 0, 5] as Margins,
    },
    {
      text: 'Complete Breakdown by Category',
      fontSize: 9,
      color: '#3c3c3c',
      alignment: 'center' as const,
      margin: [0, 0, 0, 15] as Margins,
    },
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: '#c8c8c8',
        },
      ],
      margin: [0, 0, 0, 15] as Margins,
    },
  ];

  // Sort categories by display order
  const sortedCategories = [...categories].sort((a, b) => a.display_order - b.display_order);

  sortedCategories.forEach((category, catIndex) => {
    const lineItems = category.cost_line_items || [];
    if (lineItems.length === 0) return;

    // Category header
    content.push({
      stack: [
        {
          columns: [
            {
              width: 'auto',
              text: category.code,
              fontSize: 10,
              bold: true,
              color: '#FFFFFF',
              fillColor: PDF_COLORS.primary,
              margin: [4, 2, 4, 2] as Margins,
            },
            {
              width: '*',
              text: category.description,
              fontSize: 10,
              bold: true,
              margin: [8, 2, 0, 0] as Margins,
            },
          ],
        },
      ],
      margin: [0, catIndex > 0 ? 15 : 0, 0, 8] as Margins,
    });

    // Category items table
    const categoryTotal = lineItems.reduce((sum, item) => sum + Number(item.anticipated_final || 0), 0);

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: [
          // Header row
          [
            { text: 'Description', bold: true, fontSize: 8, fillColor: '#f3f4f6' },
            { text: 'Original Budget', bold: true, fontSize: 8, alignment: 'right' as const, fillColor: '#f3f4f6' },
            { text: 'Previous Report', bold: true, fontSize: 8, alignment: 'right' as const, fillColor: '#f3f4f6' },
            { text: 'Anticipated Final', bold: true, fontSize: 8, alignment: 'right' as const, fillColor: '#f3f4f6' },
          ],
          // Data rows
          ...lineItems.map(item => [
            { text: item.description || '-', fontSize: 8 },
            { 
              text: `R${Number(item.original_budget || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              fontSize: 8, 
              alignment: 'right' as const 
            },
            { 
              text: `R${Number(item.previous_report || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              fontSize: 8, 
              alignment: 'right' as const 
            },
            { 
              text: `R${Number(item.anticipated_final || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              fontSize: 8, 
              alignment: 'right' as const,
              bold: true,
            },
          ]),
          // Category total row
          [
            { text: `${category.code} Total`, bold: true, fontSize: 8, fillColor: '#e5e7eb' },
            { text: '', fillColor: '#e5e7eb' },
            { text: '', fillColor: '#e5e7eb' },
            { 
              text: `R${categoryTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              fontSize: 8, 
              bold: true,
              alignment: 'right' as const,
              fillColor: '#e5e7eb',
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#dcdcdc',
        vLineColor: () => '#dcdcdc',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
    });
  });

  // Page break after section
  content.push({ text: '', pageBreak: 'after' as const });

  return content;
}
