/**
 * PDFMake Testing Utilities
 * Tools for testing PDF generation without actual file creation
 */

import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { pdfMake } from './config';
import { validateDocument, type ValidationResult, type DocumentSummary, getDocumentSummary } from './validation';

export interface PDFTestResult {
  success: boolean;
  validation: ValidationResult;
  summary: DocumentSummary;
  generationTime?: number;
  blobSize?: number;
  error?: string;
}

/**
 * Test PDF generation without downloading
 * Returns detailed test results including validation and performance metrics
 */
export const testPDFGeneration = async (
  docDefinition: TDocumentDefinitions
): Promise<PDFTestResult> => {
  const startTime = performance.now();

  // Validate document first
  const validation = validateDocument(docDefinition);
  const summary = getDocumentSummary(docDefinition);

  if (!validation.valid) {
    return {
      success: false,
      validation,
      summary,
      error: 'Document validation failed',
    };
  }

  try {
    // Attempt to generate the PDF blob
    const pdfDoc = pdfMake.createPdf(docDefinition);
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      pdfDoc.getBlob((result: Blob) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Failed to generate PDF blob'));
        }
      });
    });

    const generationTime = performance.now() - startTime;

    return {
      success: true,
      validation,
      summary,
      generationTime,
      blobSize: blob.size,
    };
  } catch (error) {
    return {
      success: false,
      validation,
      summary,
      generationTime: performance.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown generation error',
    };
  }
};

/**
 * Generate a PDF preview as a data URL (for iframe display)
 */
export const generatePDFPreview = async (
  docDefinition: TDocumentDefinitions
): Promise<string> => {
  const pdfDoc = pdfMake.createPdf(docDefinition);
  
  return new Promise((resolve, reject) => {
    pdfDoc.getDataUrl((dataUrl: string) => {
      if (dataUrl) {
        resolve(dataUrl);
      } else {
        reject(new Error('Failed to generate PDF preview'));
      }
    });
  });
};

/**
 * Compare two document definitions for differences
 */
export const compareDocuments = (
  doc1: TDocumentDefinitions,
  doc2: TDocumentDefinitions
): DocumentComparison => {
  const summary1 = getDocumentSummary(doc1);
  const summary2 = getDocumentSummary(doc2);

  const differences: string[] = [];

  if (summary1.pageSize !== summary2.pageSize) {
    differences.push(`Page size: ${summary1.pageSize} vs ${summary2.pageSize}`);
  }
  if (summary1.pageOrientation !== summary2.pageOrientation) {
    differences.push(`Orientation: ${summary1.pageOrientation} vs ${summary2.pageOrientation}`);
  }
  if (summary1.hasHeader !== summary2.hasHeader) {
    differences.push(`Header: ${summary1.hasHeader} vs ${summary2.hasHeader}`);
  }
  if (summary1.hasFooter !== summary2.hasFooter) {
    differences.push(`Footer: ${summary1.hasFooter} vs ${summary2.hasFooter}`);
  }
  if (summary1.styleCount !== summary2.styleCount) {
    differences.push(`Style count: ${summary1.styleCount} vs ${summary2.styleCount}`);
  }

  // Compare content stats
  const stats1 = summary1.contentStats;
  const stats2 = summary2.contentStats;
  
  if (stats1.textBlocks !== stats2.textBlocks) {
    differences.push(`Text blocks: ${stats1.textBlocks} vs ${stats2.textBlocks}`);
  }
  if (stats1.tables !== stats2.tables) {
    differences.push(`Tables: ${stats1.tables} vs ${stats2.tables}`);
  }
  if (stats1.images !== stats2.images) {
    differences.push(`Images: ${stats1.images} vs ${stats2.images}`);
  }

  return {
    identical: differences.length === 0,
    differences,
    summary1,
    summary2,
  };
};

export interface DocumentComparison {
  identical: boolean;
  differences: string[];
  summary1: DocumentSummary;
  summary2: DocumentSummary;
}

/**
 * Create a test document with sample content
 */
export const createTestDocument = (options?: {
  includeTable?: boolean;
  includeImage?: boolean;
  pageCount?: number;
}): TDocumentDefinitions => {
  const { includeTable = true, includeImage = false, pageCount = 1 } = options || {};

  const content: Content[] = [
    { text: 'Test Document', style: 'title' },
    { text: 'This is a test document generated for validation purposes.', style: 'body' },
    { text: '', margin: [0, 10, 0, 0] },
  ];

  if (includeTable) {
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', '*', '*'],
        body: [
          [
            { text: 'Header 1', bold: true },
            { text: 'Header 2', bold: true },
            { text: 'Header 3', bold: true },
          ],
          ['Cell 1', 'Cell 2', 'Cell 3'],
          ['Cell 4', 'Cell 5', 'Cell 6'],
        ],
      },
      margin: [0, 10, 0, 10],
    });
  }

  if (includeImage) {
    // Add a placeholder text since we can't include actual images in test
    content.push({
      text: '[Image placeholder - actual image would appear here]',
      style: 'caption',
      margin: [0, 10, 0, 10],
    });
  }

  // Add page breaks for multi-page documents
  for (let i = 1; i < pageCount; i++) {
    content.push(
      { text: '', pageBreak: 'after' },
      { text: `Page ${i + 1}`, style: 'h1' },
      { text: `Content for page ${i + 1}`, style: 'body' }
    );
  }

  return {
    content,
    styles: {
      title: { fontSize: 24, bold: true, margin: [0, 0, 0, 10] },
      h1: { fontSize: 18, bold: true, margin: [0, 10, 0, 5] },
      body: { fontSize: 10, margin: [0, 2, 0, 2] },
      caption: { fontSize: 8, italics: true, color: '#666666' },
    },
    defaultStyle: {
      font: 'Roboto',
    },
  };
};

/**
 * Performance benchmark for PDF generation
 */
export const benchmarkPDFGeneration = async (
  docDefinition: TDocumentDefinitions,
  iterations: number = 3
): Promise<BenchmarkResult> => {
  const times: number[] = [];
  const sizes: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    try {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      const blob = await new Promise<Blob>((resolve, reject) => {
        pdfDoc.getBlob((result: Blob) => {
          if (result) resolve(result);
          else reject(new Error('Failed to generate blob'));
        });
      });

      times.push(performance.now() - startTime);
      sizes.push(blob.size);
    } catch (error) {
      console.error(`Benchmark iteration ${i + 1} failed:`, error);
    }
  }

  if (times.length === 0) {
    return {
      averageTime: 0,
      minTime: 0,
      maxTime: 0,
      averageSize: 0,
      iterations: 0,
      successRate: 0,
    };
  }

  return {
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    averageSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
    iterations: times.length,
    successRate: times.length / iterations,
  };
};

export interface BenchmarkResult {
  averageTime: number;
  minTime: number;
  maxTime: number;
  averageSize: number;
  iterations: number;
  successRate: number;
}

/**
 * Format benchmark result for display
 */
export const formatBenchmarkResult = (result: BenchmarkResult): string => {
  return [
    `📊 PDF Generation Benchmark`,
    ``,
    `⏱️  Average time: ${result.averageTime.toFixed(2)}ms`,
    `   Min: ${result.minTime.toFixed(2)}ms | Max: ${result.maxTime.toFixed(2)}ms`,
    ``,
    `📦 Average size: ${formatBytes(result.averageSize)}`,
    ``,
    `✅ Success rate: ${(result.successRate * 100).toFixed(0)}% (${result.iterations} iterations)`,
  ].join('\n');
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
