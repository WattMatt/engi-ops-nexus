/**
 * PDFMake Document Builder
 * Fluent API for building PDF documents
 * 
 * CRITICAL: Uses getBuffer() instead of getBlob() for reliable PDF generation
 */

import type { TDocumentDefinitions, Content, PageOrientation, PageSize, Margins, StyleDictionary } from 'pdfmake/interfaces';
import { pdfMake, STANDARD_MARGINS, PAGE_SIZES, validatePdfMake } from './config';
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
   * Generate and download the PDF directly
   * This uses pdfmake's internal download which is more reliable
   */
  download(filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const docDefinition = this.build();
        console.log('[PDFMake] Starting direct download...');
        pdfMake.createPdf(docDefinition).download(filename, () => {
          console.log('[PDFMake] Download completed');
          resolve();
        });
      } catch (error) {
        console.error('[PDFMake] Download failed:', error);
        reject(error);
      }
    });
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
   * CRITICAL: Uses getBuffer() which is more reliable than getBlob()
   */
  async toBlob(timeoutMs: number = 60000): Promise<Blob> {
    console.log('[PDFMake] toBlob starting...');
    
    // Validate pdfmake configuration first
    const validation = validatePdfMake();
    if (!validation.valid) {
      console.error('[PDFMake] Validation failed:', validation.error);
      console.error('[PDFMake] Details:', validation.details);
      throw new Error(`PDF library error: ${validation.error}`);
    }
    console.log('[PDFMake] Validation passed');
    
    const docDefinition = this.build();
    
    const contentCount = Array.isArray(this.content) ? this.content.length : 1;
    const imageCount = Object.keys(docDefinition.images || {}).length;
    console.log(`[PDFMake] Building: ${contentCount} items, ${imageCount} images`);
    
    // Try getBase64 first - it's often more reliable than getBuffer/getBlob
    return this.toBlobViaBase64(docDefinition, timeoutMs);
  }

  /**
   * Convert to blob using getBase64 - more reliable in browsers
   */
  private async toBlobViaBase64(docDefinition: TDocumentDefinitions, timeoutMs: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error(`[PDFMake] Timed out after ${timeoutMs}ms`);
          reject(new Error(`PDF timed out after ${timeoutMs / 1000}s. Try Quick Export.`));
        }
      }, timeoutMs);
      
      const handleSuccess = (blob: Blob) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        console.log(`[PDFMake] Success: ${Math.round(blob.size / 1024)}KB`);
        resolve(blob);
      };
      
      const handleError = (error: any) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        console.error('[PDFMake] Error:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      
      try {
        console.log('[PDFMake] Creating PDF document...');
        const pdfDoc = pdfMake.createPdf(docDefinition);
        console.log('[PDFMake] PDF document created, getting base64...');
        
        // Use getBase64 which is often more reliable than getBuffer
        pdfDoc.getBase64((base64: string) => {
          console.log('[PDFMake] getBase64 callback received');
          
          if (resolved) {
            console.log('[PDFMake] Already resolved, ignoring callback');
            return;
          }
          
          if (!base64) {
            console.error('[PDFMake] Base64 is null/undefined');
            handleError(new Error('PDF generation returned null base64'));
            return;
          }
          
          if (base64.length === 0) {
            console.error('[PDFMake] Base64 is empty');
            handleError(new Error('PDF generation returned empty base64'));
            return;
          }
          
          console.log('[PDFMake] Base64 received, length:', base64.length, 'chars');
          
          // Convert base64 to blob
          try {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });
            console.log('[PDFMake] Blob created:', blob.size, 'bytes');
            handleSuccess(blob);
          } catch (conversionError) {
            console.error('[PDFMake] Base64 to blob conversion failed:', conversionError);
            handleError(conversionError);
          }
        });
        
        console.log('[PDFMake] getBase64 called, waiting for callback...');
      } catch (error) {
        console.error('[PDFMake] Exception during PDF creation:', error);
        handleError(error);
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
 * Returns a promise that resolves when download starts
 */
export const downloadPdf = (docDefinition: TDocumentDefinitions, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('[PDFMake] downloadPdf starting...');
      pdfMake.createPdf(docDefinition).download(filename, () => {
        console.log('[PDFMake] downloadPdf completed');
        resolve();
      });
    } catch (error) {
      console.error('[PDFMake] downloadPdf failed:', error);
      reject(error);
    }
  });
};

/**
 * Quick helper to open a PDF in a new tab
 */
export const openPdf = (docDefinition: TDocumentDefinitions): void => {
  pdfMake.createPdf(docDefinition).open();
};

/**
 * Quick helper to get a PDF as a Blob using base64 (more reliable)
 */
export const getPdfBlob = (docDefinition: TDocumentDefinitions, timeoutMs: number = 30000): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`PDF generation timed out after ${timeoutMs / 1000}s`));
      }
    }, timeoutMs);
    
    try {
      console.log('[PDFMake] getPdfBlob via base64...');
      pdfMake.createPdf(docDefinition).getBase64((base64) => {
        if (resolved) return;
        
        if (base64 && base64.length > 0) {
          try {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });
            resolved = true;
            clearTimeout(timeout);
            console.log('[PDFMake] getPdfBlob success:', blob.size, 'bytes');
            resolve(blob);
          } catch (err) {
            resolved = true;
            clearTimeout(timeout);
            reject(err);
          }
        } else {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error('Failed to generate PDF base64'));
        }
      });
    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(error);
      }
    }
  });
};
