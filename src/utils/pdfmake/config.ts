/**
 * PDFMake Configuration and Initialization
 * Centralized setup for pdfmake with fonts and base settings
 */

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize pdfmake with fonts - handle multiple VFS formats
const initializePdfMake = () => {
  try {
    // Try different VFS structures (varies by pdfmake version)
    const vfs = (pdfFonts as any).pdfMake?.vfs 
      || (pdfFonts as any).vfs 
      || (pdfFonts as any).default?.pdfMake?.vfs
      || (pdfFonts as any).default?.vfs
      || pdfFonts;
    
    if (vfs && typeof vfs === 'object' && Object.keys(vfs).length > 0) {
      pdfMake.vfs = vfs;
      console.log('[PDFMake] VFS initialized successfully with', Object.keys(vfs).length, 'fonts');
    } else {
      console.warn('[PDFMake] VFS appears empty or invalid, PDF generation may fail');
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
  return pdfMake.vfs && typeof pdfMake.vfs === 'object' && Object.keys(pdfMake.vfs).length > 0;
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
