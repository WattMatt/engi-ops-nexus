/**
 * Table of Contents Builder for Cost Reports
 * 
 * Generates a professional table of contents with dot leaders
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { PDF_COLORS } from '../styles';

interface TocEntry {
  title: string;
  page: number;
}

interface TableOfContentsOptions {
  entries: TocEntry[];
  projectName: string;
}

/**
 * Build content for table of contents
 * Note: In pdfmake, we use tocItem for automatic TOC generation,
 * but for manual control, we build the layout ourselves
 */
export function buildTableOfContentsContent(options: TableOfContentsOptions): Content[] {
  const { entries, projectName } = options;

  const content: Content[] = [
    // Header
    {
      text: 'TABLE OF CONTENTS',
      fontSize: 18,
      bold: true,
      alignment: 'center' as const,
      margin: [0, 0, 0, 10] as Margins,
    },
    {
      text: projectName,
      fontSize: 11,
      color: '#666666',
      alignment: 'center' as const,
      margin: [0, 0, 0, 20] as Margins,
    },
    {
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
      margin: [0, 0, 0, 25] as Margins,
    },
  ];

  // TOC entries with dot leaders
  entries.forEach((entry, index) => {
    content.push({
      columns: [
        {
          width: '*',
          text: entry.title,
          fontSize: 12,
          color: PDF_COLORS.primary,
          // Note: pdfmake doesn't support internal links in the same way as jsPDF
          // For now, we display the page number
        },
        {
          width: 'auto',
          text: entry.page.toString(),
          fontSize: 12,
          alignment: 'right' as const,
        },
      ],
      margin: [0, index > 0 ? 8 : 0, 0, 0] as Margins,
    });
    
    // Dot leader line
    content.push({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: '#e0e0e0',
          dash: { length: 1, space: 2 },
        },
      ],
      margin: [0, -8, 0, 0] as Margins,
    });
  });

  // Page break after TOC
  content.push({ text: '', pageBreak: 'after' as const });

  return content;
}
