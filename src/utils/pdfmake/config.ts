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
    const vfsOptions = [
      (pdfFonts as any).pdfMake?.vfs,
      (pdfFonts as any).vfs,
      (pdfFonts as any).default?.pdfMake?.vfs,
      (pdfFonts as any).default?.vfs,
      pdfFonts,
    ];
    
    let vfs = null;
    for (const option of vfsOptions) {
      if (option && typeof option === 'object' && Object.keys(option).length > 0) {
        // Check if it looks like a valid VFS (should have font files)
        const keys = Object.keys(option);
        if (keys.some(k => k.includes('.ttf') || k.includes('Roboto'))) {
          vfs = option;
          break;
        }
      }
    }
    
    if (vfs) {
      pdfMake.vfs = vfs;
      const fontCount = Object.keys(vfs).filter(k => k.includes('.ttf')).length;
      console.log(`[PDFMake] VFS initialized with ${fontCount} font files`);
    } else {
      console.error('[PDFMake] VFS initialization failed - no valid font data found');
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

// Verify VFS is ready with detailed check
export const isPdfMakeReady = (): boolean => {
  if (!pdfMake.vfs || typeof pdfMake.vfs !== 'object') {
    console.error('[PDFMake] VFS not set');
    return false;
  }
  const keys = Object.keys(pdfMake.vfs);
  const hasFonts = keys.some(k => k.includes('.ttf') || k.includes('Roboto'));
  if (!hasFonts) {
    console.error('[PDFMake] VFS has no font files');
    return false;
  }
  return true;
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
