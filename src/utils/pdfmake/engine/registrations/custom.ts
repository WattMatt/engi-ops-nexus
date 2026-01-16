/**
 * Custom Report Registration
 * 
 * A flexible report type that accepts pre-built content.
 * Use this for one-off reports or when migrating existing reports.
 */

import type { Content } from 'pdfmake/interfaces';
import { registerReportType, createReportRegistration } from '../registry';
import type { ReportConfig } from '../types';

// ============================================================================
// DATA TYPES
// ============================================================================

interface CustomReportData {
  /** Pre-built pdfmake content */
  content: Content[];
  
  /** Optional validation function */
  validate?: () => { valid: boolean; errors?: string[] };
}

// ============================================================================
// CONTENT BUILDER
// ============================================================================

function buildCustomContent(data: CustomReportData, config: ReportConfig): Content[] {
  // For custom reports, we just return the pre-built content
  return data.content;
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerReportType(createReportRegistration<CustomReportData>({
  type: 'custom',
  name: 'Custom Report',
  description: 'Flexible report type for custom or migrated reports',
  
  defaultConfig: {
    includeCoverPage: false,
    includeConfidentialNotice: false,
    page: {
      orientation: 'portrait',
      size: 'A4',
    },
  },
  
  chartConfigs: [],
  
  buildContent: buildCustomContent,
  
  validateData: (data) => {
    if (!data.content || !Array.isArray(data.content)) {
      return { valid: false, errors: ['Content array is required'] };
    }
    if (data.validate) {
      return data.validate();
    }
    return { valid: true };
  },
  
  supportedEngines: ['pdfmake', 'jspdf'],
  preferredMode: 'client',
}));
