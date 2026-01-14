/**
 * PDFMake Document Builder
 * Fluent API for building PDF documents
 */

import type { TDocumentDefinitions, Content, PageOrientation, PageSize, Margins, StyleDictionary } from 'pdfmake/interfaces';
import { pdfMake, STANDARD_MARGINS, PAGE_SIZES, isPdfMakeReady } from './config';
import { defaultStyles, tableLayouts, PDF_COLORS } from './styles';
import { format } from 'date-fns';
export interface DocumentBuilderOptions {
  orientation?: PageOrientation;
  pageSize?: PageSize;
  margins?: Margins;
  defaultStyle?: object;
  header?: Content | ((currentPage: number, pageCount: number) => Content);
  footer?: Content | ((currentPage: number, pageCount: number) => Content);
}

export class PDFDocumentBuilder {
  private content: Content[] = [];
  private options: DocumentBuilderOptions;
  private customStyles: StyleDictionary = {};
  private images: Record<string, string> = {};
  private info: TDocumentDefinitions['info'] = {};

  constructor(options: DocumentBuilderOptions = {}) {
    this.options = {
      orientation: 'portrait',
      pageSize: 'A4',
      margins: [STANDARD_MARGINS.left, STANDARD_MARGINS.top, STANDARD_MARGINS.right, STANDARD_MARGINS.bottom],
      ...options,
    };
  }

  /**
   * Add content to the document
   */
  add(content: Content | Content[]): this {
    if (Array.isArray(content)) {
      this.content.push(...content);
    } else {
      this.content.push(content);
    }
    return this;
  }

  /**
   * Add a page break
   */
  addPageBreak(): this {
    this.content.push({ text: '', pageBreak: 'after' });
    return this;
  }

  /**
   * Add custom styles
   */
  addStyles(styles: StyleDictionary): this {
    this.customStyles = { ...this.customStyles, ...styles };
    return this;
  }

  /**
   * Add images to the document
   */
  addImages(images: Record<string, string>): this {
    this.images = { ...this.images, ...images };
    return this;
  }

  /**
   * Set document metadata
   */
  setInfo(info: TDocumentDefinitions['info']): this {
    this.info = { ...this.info, ...info };
    return this;
  }

  /**
   * Set standard header with page numbers
   */
  withStandardHeader(documentTitle: string, projectName?: string): this {
    this.options.header = (currentPage: number, pageCount: number): Content => {
      if (currentPage === 1) return { text: '' } as Content;
      
      return {
        columns: [
          { 
            text: projectName ? `${documentTitle} - ${projectName}` : documentTitle,
            style: 'small',
            color: PDF_COLORS.textLight,
            margin: [STANDARD_MARGINS.left, 20, 0, 0] as Margins,
          },
          {
            text: format(new Date(), 'dd MMM yyyy'),
            style: 'small',
            color: PDF_COLORS.textLight,
            alignment: 'right' as const,
            margin: [0, 20, STANDARD_MARGINS.right, 0] as Margins,
          },
        ],
      } as Content;
    };
    return this;
  }

  /**
   * Set standard footer with page numbers
   */
  withStandardFooter(includeConfidential: boolean = false): this {
    this.options.footer = (currentPage: number, pageCount: number): Content => {
      if (currentPage === 1) return { text: '' } as Content;
      
      const pageNum = currentPage - 1;
      const totalPages = pageCount - 1;
      
      return {
        columns: [
          includeConfidential
            ? { 
                text: 'CONFIDENTIAL', 
                style: 'small', 
                color: PDF_COLORS.textLight,
                margin: [STANDARD_MARGINS.left, 0, 0, 20] as Margins,
              }
            : { text: '', width: '*' },
          {
            text: `Page ${pageNum} of ${totalPages}`,
            style: 'small',
            color: PDF_COLORS.textLight,
            alignment: 'right' as const,
            margin: [0, 0, STANDARD_MARGINS.right, 20] as Margins,
          },
        ],
      } as Content;
    };
    return this;
  }

  /**
   * Build the document definition
   */
  build(): TDocumentDefinitions {
    return {
      pageSize: this.options.pageSize,
      pageOrientation: this.options.orientation,
      pageMargins: this.options.margins,
      content: this.content,
      styles: { ...defaultStyles, ...this.customStyles },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.3,
        ...this.options.defaultStyle,
      },
      header: this.options.header,
      footer: this.options.footer,
      images: Object.keys(this.images).length > 0 ? this.images : undefined,
      info: Object.keys(this.info).length > 0 ? this.info : undefined,
    };
  }

  /**
   * Generate and download the PDF
   */
  download(filename: string): void {
    const docDefinition = this.build();
    pdfMake.createPdf(docDefinition).download(filename);
  }

  /**
   * Generate and open the PDF in a new tab
   */
  open(): void {
    const docDefinition = this.build();
    pdfMake.createPdf(docDefinition).open();
  }

  /**
   * Generate PDF as a Blob with comprehensive error handling
   */
  async toBlob(timeoutMs: number = 60000): Promise<Blob> {
    // Verify pdfmake is ready
    if (!isPdfMakeReady()) {
      console.error('[PDFMake] VFS not initialized - PDF generation will fail');
      throw new Error('PDF library not initialized. Please refresh the page and try again.');
    }
    
    const docDefinition = this.build();
    
    console.log('[PDFMake] Building PDF with', this.content.length, 'content items');
    console.log('[PDFMake] Document has images:', Object.keys(docDefinition.images || {}).length);
    
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      // Set timeout to prevent infinite hang
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('[PDFMake] PDF generation timed out after', timeoutMs, 'ms');
          reject(new Error(`PDF generation timed out after ${timeoutMs / 1000} seconds. Try Quick Export or uncheck charts.`));
        }
      }, timeoutMs);
      
      try {
        console.log('[PDFMake] Creating PDF document...');
        const pdfDoc = pdfMake.createPdf(docDefinition);
        
        console.log('[PDFMake] Generating blob...');
        pdfDoc.getBlob((blob) => {
          if (resolved) return; // Already timed out
          resolved = true;
          clearTimeout(timeout);
          
          if (blob && blob.size > 0) {
            console.log('[PDFMake] PDF blob generated successfully, size:', blob.size, 'bytes');
            resolve(blob);
          } else {
            console.error('[PDFMake] Blob generation returned empty or null blob');
            reject(new Error('Failed to generate PDF - empty result. Try Quick Export.'));
          }
        });
      } catch (error) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        console.error('[PDFMake] Synchronous error during PDF creation:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Generate PDF as a data URL
   */
  async toDataUrl(timeoutMs: number = 60000): Promise<string> {
    const docDefinition = this.build();
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`PDF data URL generation timed out after ${timeoutMs / 1000} seconds`));
        }
      }, timeoutMs);
      
      try {
        pdfMake.createPdf(docDefinition).getDataUrl((dataUrl) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          
          if (dataUrl) {
            resolve(dataUrl);
          } else {
            reject(new Error('Failed to generate PDF data URL'));
          }
        });
      } catch (error) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Generate PDF as a buffer
   */
  async toBuffer(timeoutMs: number = 60000): Promise<Buffer> {
    const docDefinition = this.build();
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`PDF buffer generation timed out after ${timeoutMs / 1000} seconds`));
        }
      }, timeoutMs);
      
      try {
        pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          
          if (buffer) {
            resolve(buffer);
          } else {
            reject(new Error('Failed to generate PDF buffer'));
          }
        });
      } catch (error) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}

/**
 * Create a new PDF document builder
 */
export const createDocument = (options?: DocumentBuilderOptions): PDFDocumentBuilder => {
  return new PDFDocumentBuilder(options);
};

/**
 * Quick helper to download a PDF from a document definition
 */
export const downloadPdf = (docDefinition: TDocumentDefinitions, filename: string): void => {
  pdfMake.createPdf(docDefinition).download(filename);
};

/**
 * Quick helper to open a PDF in a new tab
 */
export const openPdf = (docDefinition: TDocumentDefinitions): void => {
  pdfMake.createPdf(docDefinition).open();
};

/**
 * Quick helper to get a PDF as a Blob
 */
export const getPdfBlob = (docDefinition: TDocumentDefinitions): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate PDF blob'));
      }
    });
  });
};
