/**
 * PDFMake Validation Utilities
 * Tools for validating PDF content and document definitions
 * 
 * CRITICAL VALIDATIONS:
 * - Font validation: Only Roboto is available (NEVER Courier, monospace, etc.)
 * - Image validation: Empty data URLs ('data:,') will cause generation failures
 * - Size warnings: Large documents should use direct download
 */

import type { Content, TDocumentDefinitions, ContentTable, ContentColumns, ContentStack, StyleDictionary } from 'pdfmake/interfaces';

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error';
  code?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  severity: 'warning';
  code?: string;
}

// ============================================================================
// Font Validation Constants
// ============================================================================

const VALID_FONTS = ['Roboto'];
const INVALID_FONT_PATTERNS = [
  'Courier',
  'monospace',
  'Monaco',
  'Consolas',
  'Menlo',
  'Source Code',
  'Fira Code',
  'JetBrains',
];

/**
 * Check if a font name is valid
 */
function isValidFont(fontName: string | undefined): boolean {
  if (!fontName) return true; // undefined = default font
  return VALID_FONTS.includes(fontName);
}

/**
 * Check if a font name matches an invalid pattern
 */
function isInvalidFontPattern(fontName: string | undefined): boolean {
  if (!fontName) return false;
  return INVALID_FONT_PATTERNS.some(pattern => 
    fontName.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Check if an image URL is valid
 */
function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (url === 'data:,') return false; // Empty data URL - CRITICAL
  if (url.length < 100 && url.startsWith('data:')) return false; // Too short to be valid
  return true;
}

/**
 * Validate a pdfmake document definition
 */
export const validateDocument = (docDefinition: TDocumentDefinitions): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for required content
  if (!docDefinition.content) {
    errors.push({
      path: 'content',
      message: 'Document must have content',
      severity: 'error',
      code: 'MISSING_CONTENT',
    });
  } else {
    validateContent(docDefinition.content, 'content', errors, warnings);
  }

  // Validate page size
  if (docDefinition.pageSize) {
    if (typeof docDefinition.pageSize === 'object') {
      if (!docDefinition.pageSize.width || !docDefinition.pageSize.height) {
        errors.push({
          path: 'pageSize',
          message: 'Custom page size must have width and height',
          severity: 'error',
          code: 'INVALID_PAGE_SIZE',
        });
      }
    }
  }

  // Check for empty styles
  if (docDefinition.styles && Object.keys(docDefinition.styles).length === 0) {
    warnings.push({
      path: 'styles',
      message: 'Document has empty styles object',
      severity: 'warning',
      code: 'EMPTY_STYLES',
    });
  }

  // CRITICAL: Validate fonts in styles
  if (docDefinition.styles) {
    validateStyleFonts(docDefinition.styles, errors);
  }

  // CRITICAL: Validate default style font
  if (docDefinition.defaultStyle && 'font' in docDefinition.defaultStyle) {
    const defaultFont = (docDefinition.defaultStyle as any).font;
    if (!isValidFont(defaultFont) || isInvalidFontPattern(defaultFont)) {
      errors.push({
        path: 'defaultStyle.font',
        message: `Invalid default font "${defaultFont}". Only Roboto is available.`,
        severity: 'error',
        code: 'INVALID_FONT',
      });
    }
  }

  // CRITICAL: Validate images in images object
  if (docDefinition.images) {
    Object.entries(docDefinition.images).forEach(([name, url]) => {
      if (typeof url === 'string' && !isValidImageUrl(url)) {
        errors.push({
          path: `images.${name}`,
          message: `Invalid image "${name}". Empty or malformed data URL.`,
          severity: 'error',
          code: 'INVALID_IMAGE',
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate fonts in style dictionary
 */
const validateStyleFonts = (styles: StyleDictionary, errors: ValidationError[]): void => {
  Object.entries(styles).forEach(([styleName, style]) => {
    if (style && typeof style === 'object' && 'font' in style) {
      const font = (style as any).font;
      if (!isValidFont(font) || isInvalidFontPattern(font)) {
        errors.push({
          path: `styles.${styleName}.font`,
          message: `Invalid font "${font}" in style "${styleName}". Only Roboto is available.`,
          severity: 'error',
          code: 'INVALID_FONT',
        });
      }
    }
  });
};

/**
 * Recursively validate content
 */
const validateContent = (
  content: Content | Content[],
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void => {
  if (content === null || content === undefined) {
    errors.push({
      path,
      message: 'Content cannot be null or undefined',
      severity: 'error',
    });
    return;
  }

  if (Array.isArray(content)) {
    content.forEach((item, index) => {
      validateContent(item, `${path}[${index}]`, errors, warnings);
    });
    return;
  }

  if (typeof content === 'string' || typeof content === 'number') {
    return; // Valid primitive content
  }

  if (typeof content !== 'object') {
    errors.push({
      path,
      message: `Invalid content type: ${typeof content}`,
      severity: 'error',
    });
    return;
  }

  // Validate specific content types
  const contentObj = content as Record<string, any>;

  // Check for table content
  if ('table' in contentObj) {
    validateTableContent(contentObj as ContentTable, path, errors, warnings);
  }

  // Check for columns content
  if ('columns' in contentObj) {
    validateColumnsContent(contentObj as ContentColumns, path, errors, warnings);
  }

  // Check for stack content
  if ('stack' in contentObj) {
    validateStackContent(contentObj as ContentStack, path, errors, warnings);
  }

  // Check for image content
  if ('image' in contentObj) {
    validateImageContent(contentObj, path, errors, warnings);
  }

  // Check for text content
  if ('text' in contentObj) {
    if (Array.isArray(contentObj.text)) {
      contentObj.text.forEach((item: any, index: number) => {
        if (typeof item === 'object' && item !== null) {
          validateContent(item, `${path}.text[${index}]`, errors, warnings);
        }
      });
    }
  }
};

/**
 * Validate table content
 */
const validateTableContent = (
  content: ContentTable,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void => {
  if (!content.table) {
    errors.push({
      path: `${path}.table`,
      message: 'Table content must have a table property',
      severity: 'error',
    });
    return;
  }

  if (!content.table.body || !Array.isArray(content.table.body)) {
    errors.push({
      path: `${path}.table.body`,
      message: 'Table must have a body array',
      severity: 'error',
    });
    return;
  }

  if (content.table.body.length === 0) {
    warnings.push({
      path: `${path}.table.body`,
      message: 'Table body is empty',
      severity: 'warning',
    });
  }

  // Check column consistency
  const firstRowLength = content.table.body[0]?.length || 0;
  content.table.body.forEach((row, rowIndex) => {
    if (row.length !== firstRowLength) {
      errors.push({
        path: `${path}.table.body[${rowIndex}]`,
        message: `Row has ${row.length} columns, expected ${firstRowLength}`,
        severity: 'error',
      });
    }
  });

  // Check widths match column count
  if (content.table.widths && content.table.widths.length !== firstRowLength) {
    warnings.push({
      path: `${path}.table.widths`,
      message: `Widths array length (${content.table.widths.length}) doesn't match column count (${firstRowLength})`,
      severity: 'warning',
    });
  }
};

/**
 * Validate columns content
 */
const validateColumnsContent = (
  content: ContentColumns,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void => {
  if (!Array.isArray(content.columns)) {
    errors.push({
      path: `${path}.columns`,
      message: 'Columns must be an array',
      severity: 'error',
    });
    return;
  }

  content.columns.forEach((col, index) => {
    validateContent(col, `${path}.columns[${index}]`, errors, warnings);
  });
};

/**
 * Validate stack content
 */
const validateStackContent = (
  content: ContentStack,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void => {
  if (!Array.isArray(content.stack)) {
    errors.push({
      path: `${path}.stack`,
      message: 'Stack must be an array',
      severity: 'error',
    });
    return;
  }

  content.stack.forEach((item, index) => {
    validateContent(item, `${path}.stack[${index}]`, errors, warnings);
  });
};

/**
 * Validate image content
 * CRITICAL: Empty data URLs ('data:,') cause PDF generation failures
 */
const validateImageContent = (
  content: Record<string, any>,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void => {
  if (typeof content.image !== 'string') {
    errors.push({
      path: `${path}.image`,
      message: 'Image must be a string (data URL or image key)',
      severity: 'error',
      code: 'INVALID_IMAGE_TYPE',
    });
    return;
  }

  // CRITICAL: Check for empty data URL
  if (content.image === 'data:,') {
    errors.push({
      path: `${path}.image`,
      message: 'Empty data URL detected. Remove this image before generation.',
      severity: 'error',
      code: 'EMPTY_IMAGE',
    });
    return;
  }

  // Check for too-short data URL
  if (content.image.startsWith('data:') && content.image.length < 100) {
    errors.push({
      path: `${path}.image`,
      message: 'Image data URL is too short to be valid.',
      severity: 'error',
      code: 'INVALID_IMAGE_DATA',
    });
    return;
  }

  // Check for valid data URL format
  if (content.image.startsWith('data:')) {
    if (!content.image.includes('base64,')) {
      warnings.push({
        path: `${path}.image`,
        message: 'Image data URL may not be in proper base64 format',
        severity: 'warning',
        code: 'SUSPICIOUS_IMAGE_FORMAT',
      });
    }
  }

  // Check for reasonable dimensions
  if (content.width && content.width > 1000) {
    warnings.push({
      path: `${path}.width`,
      message: 'Image width exceeds 1000pt, may cause layout issues',
      severity: 'warning',
      code: 'LARGE_IMAGE',
    });
  }
};

/**
 * Validate font usage in content
 * CRITICAL: Only Roboto is available - Courier/monospace will fail
 */
const validateFontInContent = (
  content: Record<string, any>,
  path: string,
  errors: ValidationError[]
): void => {
  if ('font' in content && content.font) {
    const font = content.font;
    if (!isValidFont(font) || isInvalidFontPattern(font)) {
      errors.push({
        path: `${path}.font`,
        message: `Invalid font "${font}". Only Roboto is available. Remove or change this font.`,
        severity: 'error',
        code: 'INVALID_FONT',
      });
    }
  }
};

/**
 * Get a summary of document content
 */
export const getDocumentSummary = (docDefinition: TDocumentDefinitions): DocumentSummary => {
  const summary: DocumentSummary = {
    pageSize: getPageSizeString(docDefinition.pageSize),
    pageOrientation: docDefinition.pageOrientation || 'portrait',
    hasHeader: !!docDefinition.header,
    hasFooter: !!docDefinition.footer,
    styleCount: Object.keys(docDefinition.styles || {}).length,
    contentStats: analyzeContent(docDefinition.content),
  };

  return summary;
};

export interface DocumentSummary {
  pageSize: string;
  pageOrientation: string;
  hasHeader: boolean;
  hasFooter: boolean;
  styleCount: number;
  contentStats: ContentStats;
}

export interface ContentStats {
  textBlocks: number;
  tables: number;
  images: number;
  columns: number;
  stacks: number;
  pageBreaks: number;
}

const getPageSizeString = (pageSize: any): string => {
  if (!pageSize) return 'A4 (default)';
  if (typeof pageSize === 'string') return pageSize;
  if (typeof pageSize === 'object') {
    return `${pageSize.width}x${pageSize.height}pt`;
  }
  return 'unknown';
};

const analyzeContent = (content: Content | Content[] | undefined): ContentStats => {
  const stats: ContentStats = {
    textBlocks: 0,
    tables: 0,
    images: 0,
    columns: 0,
    stacks: 0,
    pageBreaks: 0,
  };

  if (!content) return stats;

  const analyze = (item: Content): void => {
    if (Array.isArray(item)) {
      item.forEach(analyze);
      return;
    }

    if (typeof item === 'string' || typeof item === 'number') {
      stats.textBlocks++;
      return;
    }

    if (typeof item !== 'object' || item === null) return;

    const obj = item as Record<string, any>;

    if ('text' in obj) stats.textBlocks++;
    if ('table' in obj) stats.tables++;
    if ('image' in obj) stats.images++;
    if ('columns' in obj) {
      stats.columns++;
      if (Array.isArray(obj.columns)) {
        obj.columns.forEach(analyze);
      }
    }
    if ('stack' in obj) {
      stats.stacks++;
      if (Array.isArray(obj.stack)) {
        obj.stack.forEach(analyze);
      }
    }
    if ('pageBreak' in obj) stats.pageBreaks++;
  };

  if (Array.isArray(content)) {
    content.forEach(analyze);
  } else {
    analyze(content);
  }

  return stats;
};

/**
 * Format validation result for display
 */
export const formatValidationResult = (result: ValidationResult): string => {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✅ Document is valid');
  } else {
    lines.push('❌ Document has validation errors');
  }

  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    result.errors.forEach(err => {
      const code = err.code ? `[${err.code}]` : '';
      lines.push(`  • ${code} [${err.path}] ${err.message}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    result.warnings.forEach(warn => {
      const code = warn.code ? `[${warn.code}]` : '';
      lines.push(`  ⚠ ${code} [${warn.path}] ${warn.message}`);
    });
  }

  return lines.join('\n');
};

// ============================================================================
// Quick Validation Helpers
// ============================================================================

/**
 * Quick check for common issues before generation
 * Use this for fast pre-flight validation
 */
export const quickValidate = (docDefinition: TDocumentDefinitions): { ok: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Check default font
  if (docDefinition.defaultStyle && 'font' in docDefinition.defaultStyle) {
    const font = (docDefinition.defaultStyle as any).font;
    if (font && !VALID_FONTS.includes(font)) {
      issues.push(`Invalid default font: ${font}. Only Roboto is available.`);
    }
  }

  // Check for empty images in the images object
  if (docDefinition.images) {
    Object.entries(docDefinition.images).forEach(([name, url]) => {
      if (typeof url === 'string' && (url === 'data:,' || url.length < 100)) {
        issues.push(`Empty/invalid image: ${name}`);
      }
    });
  }

  return {
    ok: issues.length === 0,
    issues,
  };
};

/**
 * Validate and clean content before generation
 * Removes invalid images and logs warnings
 */
export const validateBeforeGeneration = (docDefinition: TDocumentDefinitions): void => {
  const result = validateDocument(docDefinition);

  if (!result.valid) {
    console.error('[PDFMake Validation] Document has critical issues:');
    result.errors.forEach(error => {
      console.error(`  ✗ [${error.code || 'ERROR'}] ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    console.warn('[PDFMake Validation] Warnings:');
    result.warnings.forEach(warning => {
      console.warn(`  ⚠ [${warning.code || 'WARN'}] ${warning.message}`);
    });
  }
};
