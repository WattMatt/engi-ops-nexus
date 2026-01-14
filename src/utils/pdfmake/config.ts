/**
 * PDFMake Configuration and Initialization
 * Centralized setup for pdfmake with fonts and base settings
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// ============================================================================
// VFS FONT INITIALIZATION - CRITICAL FIX
// ============================================================================

/**
 * Initialize pdfmake with fonts using the proven pattern
 * This is the most critical step - if fonts don't load, PDF generation hangs
 */
const initializePdfMake = () => {
  try {
    // The correct pattern for pdfmake font initialization
    // Try multiple access patterns to handle different bundle formats
    const vfs = (pdfFonts as any)?.pdfMake?.vfs ||  // Standard pattern
                (pdfFonts as any)?.vfs ||            // Alternative pattern
                pdfFonts;                             // Direct export
    
    if (!vfs || typeof vfs !== 'object') {
      console.error('[PDFMake] CRITICAL: VFS fonts object not found!');
      console.error('[PDFMake] pdfFonts type:', typeof pdfFonts);
      console.error('[PDFMake] pdfFonts keys:', Object.keys(pdfFonts || {}).slice(0, 10));
      return false;
    }
    
    // Check if it looks like a valid VFS (should have font files)
    const vfsKeys = Object.keys(vfs);
    const hasFontFiles = vfsKeys.some(key => key.endsWith('.ttf'));
    
    if (!hasFontFiles) {
      console.error('[PDFMake] CRITICAL: VFS object has no font files!');
      console.error('[PDFMake] VFS keys sample:', vfsKeys.slice(0, 5));
      return false;
    }
    
    // Direct VFS assignment - the proven working pattern
    (pdfMake as any).vfs = vfs;
    
    // Verify the assignment worked
    if (!(pdfMake as any).vfs) {
      console.error('[PDFMake] CRITICAL: VFS assignment failed!');
      return false;
    }
    
    console.log('[PDFMake] VFS initialized successfully');
    console.log('[PDFMake] Font files count:', vfsKeys.filter(k => k.endsWith('.ttf')).length);
    return true;
  } catch (error) {
    console.error('[PDFMake] Failed to initialize VFS:', error);
    return false;
  }
};

// Initialize on module load
const initSuccess = initializePdfMake();

// Define font families
pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if pdfMake is properly initialized and ready to generate PDFs
 */
export const isPdfMakeReady = (): boolean => {
  if (!initSuccess) {
    console.warn('[PDFMake] isPdfMakeReady: Initial setup failed');
    return false;
  }
  
  const vfs = (pdfMake as any).vfs;
  if (!vfs || typeof vfs !== 'object') {
    console.warn('[PDFMake] isPdfMakeReady: VFS not found');
    return false;
  }
  
  const vfsKeys = Object.keys(vfs);
  if (vfsKeys.length === 0) {
    console.warn('[PDFMake] isPdfMakeReady: VFS is empty');
    return false;
  }
  
  return true;
};

/**
 * Validate pdfMake configuration with detailed error messages
 */
export const validatePdfMake = (): { valid: boolean; error?: string; details?: string } => {
  // Check VFS exists
  const vfs = (pdfMake as any).vfs;
  if (!vfs) {
    return { 
      valid: false, 
      error: 'VFS not initialized',
      details: 'pdfMake.vfs is undefined. Font bundle may not be loaded correctly.'
    };
  }
  
  // Check VFS is an object
  if (typeof vfs !== 'object') {
    return { 
      valid: false, 
      error: 'VFS is not an object',
      details: `Expected object, got ${typeof vfs}`
    };
  }
  
  // Check for required font files
  const requiredFonts = ['Roboto-Regular.ttf', 'Roboto-Medium.ttf'];
  const vfsKeys = Object.keys(vfs);
  
  for (const font of requiredFonts) {
    if (!vfsKeys.includes(font)) {
      return { 
        valid: false, 
        error: `Missing font: ${font}`,
        details: `Available fonts: ${vfsKeys.filter(k => k.endsWith('.ttf')).join(', ')}`
      };
    }
  }
  
  // Check font data is not empty
  const testFontData = vfs['Roboto-Regular.ttf'];
  if (!testFontData || (typeof testFontData === 'string' && testFontData.length < 100)) {
    return {
      valid: false,
      error: 'Font data appears corrupt',
      details: `Roboto-Regular.ttf data length: ${testFontData?.length || 0}`
    };
  }
  
  return { valid: true };
};

/**
 * Test PDF generation with a minimal document
 * Returns true if pdfmake can generate PDFs successfully
 */
export const testPdfGeneration = async (): Promise<boolean> => {
  console.log('[PDFMake] Running test PDF generation...');
  
  // First validate configuration
  const validation = validatePdfMake();
  if (!validation.valid) {
    console.error('[PDFMake] Test failed - validation error:', validation.error);
    console.error('[PDFMake] Details:', validation.details);
    return false;
  }
  
  // Try to create a minimal PDF
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      console.error('[PDFMake] Test timed out after 10 seconds');
      resolve(false);
    }, 10000);
    
    try {
      const testDoc = {
        content: [{ text: 'Test Document', fontSize: 14 }],
        defaultStyle: { font: 'Roboto' }
      };
      
      console.log('[PDFMake] Creating test PDF...');
      const pdfDoc = pdfMake.createPdf(testDoc);
      
      // Use getBuffer which is more reliable than getBlob
      console.log('[PDFMake] Getting PDF buffer...');
      pdfDoc.getBuffer((buffer: Uint8Array) => {
        clearTimeout(timeoutId);
        
        if (buffer && buffer.byteLength > 0) {
          console.log('[PDFMake] Test PASSED - PDF generated successfully');
          console.log('[PDFMake] Test PDF size:', buffer.byteLength, 'bytes');
          resolve(true);
        } else {
          console.error('[PDFMake] Test failed - empty buffer');
          resolve(false);
        }
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[PDFMake] Test failed with exception:', err);
      resolve(false);
    }
  });
};

/**
 * Quick synchronous check if PDF generation is likely to work
 * This doesn't actually generate a PDF, just checks configuration
 */
export const quickPdfCheck = (): boolean => {
  const validation = validatePdfMake();
  return validation.valid;
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
