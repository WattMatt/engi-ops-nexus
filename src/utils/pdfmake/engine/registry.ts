/**
 * Unified PDF Engine - Report Type Registry
 * 
 * Central registry for all report types.
 * Provides declarative configuration for each report type.
 */

import type { Content } from 'pdfmake/interfaces';
import type { 
  ReportType, 
  ReportTypeRegistration, 
  ReportConfig, 
  ChartCaptureConfig 
} from './types';

// ============================================================================
// REGISTRY STORAGE
// ============================================================================

const reportRegistry = new Map<ReportType, ReportTypeRegistration>();

// ============================================================================
// REGISTRY FUNCTIONS
// ============================================================================

/**
 * Register a new report type
 */
export function registerReportType(registration: ReportTypeRegistration): void {
  if (reportRegistry.has(registration.type)) {
    console.warn(`[PDFRegistry] Overwriting existing registration for: ${registration.type}`);
  }
  reportRegistry.set(registration.type, registration);
  console.log(`[PDFRegistry] Registered report type: ${registration.type}`);
}

/**
 * Get a report type registration
 */
export function getReportType(type: ReportType): ReportTypeRegistration | undefined {
  return reportRegistry.get(type);
}

/**
 * Check if a report type is registered
 */
export function hasReportType(type: ReportType): boolean {
  return reportRegistry.has(type);
}

/**
 * Get all registered report types
 */
export function getAllReportTypes(): ReportType[] {
  return Array.from(reportRegistry.keys());
}

/**
 * Get all registrations
 */
export function getAllRegistrations(): ReportTypeRegistration[] {
  return Array.from(reportRegistry.values());
}

/**
 * Build content for a report type
 */
export function buildReportContent(
  type: ReportType, 
  data: any, 
  config: ReportConfig
): Content[] {
  const registration = reportRegistry.get(type);
  if (!registration) {
    throw new Error(`Unknown report type: ${type}`);
  }
  return registration.buildContent(data, config);
}

/**
 * Validate data for a report type
 */
export function validateReportData(
  type: ReportType, 
  data: any
): { valid: boolean; errors?: string[] } {
  const registration = reportRegistry.get(type);
  if (!registration) {
    return { valid: false, errors: [`Unknown report type: ${type}`] };
  }
  if (!registration.validateData) {
    return { valid: true };
  }
  return registration.validateData(data);
}

/**
 * Get chart configurations for a report type
 */
export function getChartConfigs(type: ReportType): ChartCaptureConfig[] {
  const registration = reportRegistry.get(type);
  return registration?.chartConfigs || [];
}

/**
 * Get default config for a report type
 */
export function getDefaultConfig(type: ReportType): Partial<ReportConfig> {
  const registration = reportRegistry.get(type);
  return registration?.defaultConfig || {};
}

// ============================================================================
// HELPER TO CREATE REGISTRATION
// ============================================================================

/**
 * Helper to create a report type registration with type safety
 */
export function createReportRegistration<T>(
  config: Omit<ReportTypeRegistration, 'buildContent' | 'validateData'> & {
    buildContent: (data: T, config: ReportConfig) => Content[];
    validateData?: (data: T) => { valid: boolean; errors?: string[] };
  }
): ReportTypeRegistration {
  return config as ReportTypeRegistration;
}

// ============================================================================
// REPORT METADATA
// ============================================================================

/**
 * Get human-readable info about a report type
 */
export function getReportTypeInfo(type: ReportType): {
  name: string;
  description: string;
  supportedEngines: string[];
} | null {
  const registration = reportRegistry.get(type);
  if (!registration) return null;
  
  return {
    name: registration.name,
    description: registration.description || '',
    supportedEngines: registration.supportedEngines,
  };
}

/**
 * List all report types with their info
 */
export function listReportTypes(): Array<{
  type: ReportType;
  name: string;
  description: string;
}> {
  return Array.from(reportRegistry.entries()).map(([type, reg]) => ({
    type,
    name: reg.name,
    description: reg.description || '',
  }));
}
