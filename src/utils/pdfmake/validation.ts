/**
 * PDFMake Validation Utilities
 * Tools for validating PDF content and document definitions
 */

import type { Content, TDocumentDefinitions, ContentTable, ContentColumns, ContentStack } from 'pdfmake/interfaces';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  path: string;
  message: string;
  severity: 'warning';
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
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
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
      });
    }
  }

  // Check for reasonable dimensions
  if (content.width && content.width > 1000) {
    warnings.push({
      path: `${path}.width`,
      message: 'Image width exceeds 1000pt, may cause layout issues',
      severity: 'warning',
    });
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
      lines.push(`  • [${err.path}] ${err.message}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    result.warnings.forEach(warn => {
      lines.push(`  ⚠ [${warn.path}] ${warn.message}`);
    });
  }

  return lines.join('\n');
};
