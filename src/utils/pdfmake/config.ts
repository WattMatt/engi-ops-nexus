/**
 * PDFMake Configuration and Initialization
 * Centralized setup for pdfmake with fonts and base settings
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize pdfmake with fonts - direct assignment pattern
const initializePdfMake = () => {
  try {
    // Direct VFS assignment - the standard pattern for pdfmake
    const vfs = (pdfFonts as any).pdfMake?.vfs || 
                (pdfFonts as any).vfs || 
                (pdfFonts as any).default?.pdfMake?.vfs ||
                (pdfFonts as any).default?.vfs ||
                pdfFonts;
    
    if (vfs && typeof vfs === 'object') {
      pdfMake.vfs = vfs;
      console.log('[PDFMake] VFS initialized successfully');
    } else {
      console.error('[PDFMake] VFS initialization failed - invalid font data');
    }
  } catch (error) {
    console.error('[PDFMake] Failed to initialize VFS:', error);
  }
  
  // Define font families
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };
};

// Initialize immediately
initializePdfMake();

// Verify VFS is ready
export const isPdfMakeReady = (): boolean => {
  if (!pdfMake.vfs || typeof pdfMake.vfs !== 'object') {
    return false;
  }
  return Object.keys(pdfMake.vfs).length > 0;
};

/**
 * Test PDF generation with a minimal document
 * Returns true if pdfmake can generate PDFs successfully
 */
export const testPdfGeneration = async (): Promise<boolean> => {
  try {
    if (!isPdfMakeReady()) {
      console.error('[PDFMake] Test failed - VFS not ready');
      return false;
    }
    
    const testDoc = {
      content: [{ text: 'Test', fontSize: 12 }],
      defaultStyle: { font: 'Roboto' }
    };
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.error('[PDFMake] Test timed out');
        resolve(false);
      }, 5000);
      
      try {
        pdfMake.createPdf(testDoc).getBlob((blob) => {
          clearTimeout(timeout);
          if (blob && blob.size > 0) {
            console.log('[PDFMake] Test passed - can generate PDFs');
            resolve(true);
          } else {
            console.error('[PDFMake] Test failed - empty blob');
            resolve(false);
          }
        });
      } catch (err) {
        clearTimeout(timeout);
        console.error('[PDFMake] Test failed:', err);
        resolve(false);
      }
    });
  } catch (error) {
    console.error('[PDFMake] Test error:', error);
    return false;
  }
};

export { pdfMake };

// Standard page sizes in points (72 points = 1 inch)
export const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 } as const,
  LETTER: { width: 612, height: 792 } as const,
  A3: { width: 841.89, height: 1190.55 } as const,
} as const;

// Standard margins in points
export const STANDARD_MARGINS = {
  top: 56.69,    // 20mm
  right: 42.52,  // 15mm
  bottom: 56.69, // 20mm
  left: 42.52    // 15mm
} as const;

// Convert mm to points (1mm = 2.8346 points)
export const mmToPoints = (mm: number): number => mm * 2.8346;

// Convert points to mm
export const pointsToMm = (points: number): number => points / 2.8346;
