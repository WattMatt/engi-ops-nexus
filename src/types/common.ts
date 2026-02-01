/**
 * Common TypeScript Types and Interfaces
 * Centralizes shared type definitions for improved type safety
 */

import { LucideIcon } from "lucide-react";

// ============================================
// Generic Utility Types
// ============================================

/** Makes specific properties optional in a type */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Makes specific properties required in a type */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Deep partial type for nested objects */
export type DeepPartial<T> = T extends object 
  ? { [P in keyof T]?: DeepPartial<T[P]> } 
  : T;

/** Extract the element type from an array */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/** Nullable type helper */
export type Nullable<T> = T | null;

/** Make all properties mutable */
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Form and Input Types
// ============================================

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: LucideIcon;
}

export interface FormFieldError {
  field: string;
  message: string;
}

export interface FormState<T> {
  values: T;
  errors: Record<keyof T, string | undefined>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// ============================================
// Entity Base Types
// ============================================

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface AuditableEntity extends BaseEntity {
  created_by?: string | null;
  updated_by?: string | null;
}

export interface SoftDeletableEntity extends BaseEntity {
  deleted_at?: string | null;
  is_deleted?: boolean;
}

// ============================================
// User and Auth Types
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  company_id?: string | null;
  role?: string | null;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// Project Types
// ============================================

export interface ProjectBase {
  id: string;
  name: string;
  project_number?: string | null;
  status?: string | null;
  client_id?: string | null;
}

export interface ProjectContext {
  projectId: string | null;
  projectName: string | null;
  projectNumber?: string | null;
}

// ============================================
// File and Document Types
// ============================================

export interface FileMetadata {
  id: string;
  file_name: string;
  file_path: string;
  file_type?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
  metadata?: FileMetadata;
}

// ============================================
// UI Component Types
// ============================================

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  accessor?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

export interface SortConfig<T> {
  key: keyof T | null;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: unknown;
}

// ============================================
// Status and State Types
// ============================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  status: LoadingState;
}

export type EntityStatus = 'draft' | 'active' | 'pending' | 'approved' | 'rejected' | 'archived';

// ============================================
// Event Handler Types
// ============================================

export type VoidCallback = () => void;
export type ValueCallback<T> = (value: T) => void;
export type AsyncCallback<T = void> = () => Promise<T>;
export type AsyncValueCallback<T, R = void> = (value: T) => Promise<R>;

// ============================================
// Report Types
// ============================================

export interface ReportBase {
  id: string;
  project_id: string;
  report_type: string;
  file_path?: string | null;
  file_name?: string | null;
  generated_at?: string | null;
  status?: string | null;
}

export interface ReportConfig {
  title: string;
  subtitle?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  dateFormat?: string;
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
}

// ============================================
// Calculation Types
// ============================================

export interface CalculationResult<T = number> {
  value: T;
  formula?: string;
  inputs?: Record<string, unknown>;
  warnings?: string[];
}

export interface RateInfo {
  rate: number;
  unit: string;
  source?: string;
  effectiveDate?: string;
}
