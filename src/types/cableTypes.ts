/**
 * Cable Types
 * Type definitions for cable sizing and validation
 */

export interface ValidationWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  code?: string;
}
