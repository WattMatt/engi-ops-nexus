/**
 * Table of Contents Builder for Cost Reports
 * 
 * Generates a professional table of contents with dot leaders and clickable links
 * Uses pdfmake's tocItem and linkToDestination for internal navigation
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { PDF_COLORS } from '../styles';

export interface TocEntry {
  /** Display title in the TOC */
  title: string;
  /** Page number (for display) */
  page: number;
  /** Unique ID for linking - use this as the id on target content */
  id: string;
}

interface TableOfContentsOptions {
  entries: TocEntry[];
  projectName: string;
}

/**
 * Generates a unique TOC entry ID from a title
 */
export function generateTocId(title: string, index?: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return index !== undefined ? `${base}-${index}` : base;
}

/**
 * Creates a content block with a destination anchor for TOC linking
 * Wrap your section headers with this to make them linkable from the TOC
 */
export function createLinkedSection(
  id: string,
  content: Content
): Content {
  return {
    ...content as object,
    id,
  } as Content;
}

/**
 * Build content for table of contents with clickable links
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

  // TOC entries with dot leaders and clickable links
  entries.forEach((entry, index) => {
    // Create a table for better dot leader alignment
    content.push({
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            {
              text: entry.title,
              fontSize: 12,
              color: PDF_COLORS.primary,
              linkToDestination: entry.id,
              decoration: 'underline',
              decorationColor: PDF_COLORS.primary,
              border: [false, false, false, false],
            },
            {
              text: entry.page.toString(),
              fontSize: 12,
              alignment: 'right' as const,
              linkToDestination: entry.id,
              border: [false, false, false, false],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, index > 0 ? 6 : 0, 0, 0] as Margins,
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
      margin: [0, -6, 0, 0] as Margins,
    });
  });

  // Page break after TOC
  content.push({ text: '', pageBreak: 'after' as const });

  return content;
}

/**
 * Helper to create standard TOC entries for cost reports
 */
export function createCostReportTocEntries(options: {
  includeExecutiveSummary: boolean;
  includeVisualSummary: boolean;
  includeCategoryDetails: boolean;
  includeDetailedLineItems: boolean;
  includeVariations: boolean;
  categoryNames?: string[];
}): TocEntry[] {
  const entries: TocEntry[] = [];
  let pageNumber = 3; // Start after cover + TOC

  if (options.includeExecutiveSummary) {
    entries.push({
      title: 'Executive Summary',
      page: pageNumber,
      id: 'executive-summary',
    });
    pageNumber++;
  }

  if (options.includeVisualSummary) {
    entries.push({
      title: 'Visual Summary',
      page: pageNumber,
      id: 'visual-summary',
    });
    pageNumber++;
  }

  if (options.includeCategoryDetails && options.categoryNames) {
    entries.push({
      title: 'Category Details',
      page: pageNumber,
      id: 'category-details',
    });
    // Estimate pages for categories
    pageNumber += Math.ceil(options.categoryNames.length / 2);
  }

  if (options.includeDetailedLineItems) {
    entries.push({
      title: 'Detailed Line Items',
      page: pageNumber,
      id: 'detailed-line-items',
    });
    pageNumber += 2; // Estimate
  }

  if (options.includeVariations) {
    entries.push({
      title: 'Variation Sheets',
      page: pageNumber,
      id: 'variations',
    });
  }

  return entries;
}
