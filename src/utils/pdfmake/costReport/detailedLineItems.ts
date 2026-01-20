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
  const content: Content[] = [];

  // Sort categories by display order
  const sortedCategories = [...categories].sort((a, b) => a.display_order - b.display_order);
  
  // Filter out categories with no line items
  const categoriesWithItems = sortedCategories.filter(cat => (cat.cost_line_items || []).length > 0);

  categoriesWithItems.forEach((category, catIndex) => {
    const lineItems = category.cost_line_items || [];
    const isLastCategory = catIndex === categoriesWithItems.length - 1;

    // Category page header (each category gets its own page)
    content.push({
      text: `${category.code}  ${category.description.toUpperCase()}`,
      fontSize: 14,
      bold: true,
      color: PDF_COLORS.primary,
      margin: [0, 0, 0, 15] as Margins,
    });

    // Separator line
    content.push({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1,
          lineColor: PDF_COLORS.primary,
        },
      ],
      margin: [0, 0, 0, 15] as Margins,
    });

    // Category items table
    const categoryTotal = lineItems.reduce((sum, item) => sum + Number(item.anticipated_final || 0), 0);
    const originalTotal = lineItems.reduce((sum, item) => sum + Number(item.original_budget || 0), 0);
    const previousTotal = lineItems.reduce((sum, item) => sum + Number(item.previous_report || 0), 0);

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 80, 80, 90],
        body: [
          // Header row
          [
            { text: 'Description', bold: true, fontSize: 9, fillColor: PDF_COLORS.primary, color: '#FFFFFF' },
            { text: 'Original Budget', bold: true, fontSize: 9, alignment: 'right' as const, fillColor: PDF_COLORS.primary, color: '#FFFFFF' },
            { text: 'Previous Report', bold: true, fontSize: 9, alignment: 'right' as const, fillColor: PDF_COLORS.primary, color: '#FFFFFF' },
            { text: 'Anticipated Final', bold: true, fontSize: 9, alignment: 'right' as const, fillColor: PDF_COLORS.primary, color: '#FFFFFF' },
          ],
          // Data rows with zebra striping
          ...lineItems.map((item, rowIndex) => [
            { 
              text: item.description || '-', 
              fontSize: 9,
              fillColor: rowIndex % 2 === 1 ? '#f9fafb' : undefined,
            },
            { 
              text: `R${Number(item.original_budget || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              fontSize: 9, 
              alignment: 'right' as const,
              fillColor: rowIndex % 2 === 1 ? '#f9fafb' : undefined,
            },
            { 
              text: `R${Number(item.previous_report || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              fontSize: 9, 
              alignment: 'right' as const,
              fillColor: rowIndex % 2 === 1 ? '#f9fafb' : undefined,
            },
            { 
              text: `R${Number(item.anticipated_final || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              fontSize: 9, 
              alignment: 'right' as const,
              bold: true,
              fillColor: rowIndex % 2 === 1 ? '#f9fafb' : undefined,
            },
          ]),
          // Category total row
          [
            { text: `${category.code} Total`, bold: true, fontSize: 9, fillColor: '#e5e7eb' },
            { 
              text: `R${originalTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              fontSize: 9, 
              bold: true,
              alignment: 'right' as const,
              fillColor: '#e5e7eb',
            },
            { 
              text: `R${previousTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              fontSize: 9, 
              bold: true,
              alignment: 'right' as const,
              fillColor: '#e5e7eb',
            },
            { 
              text: `R${categoryTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              fontSize: 9, 
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
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
    });

    // Page break after each category (except the last one)
    if (!isLastCategory) {
      content.push({ text: '', pageBreak: 'after' as const });
    }
  });

  // Final page break after section
  content.push({ text: '', pageBreak: 'after' as const });

  return content;
}
