/**
 * Document and Report Type Definitions
 * Replaces 'any' types in document-related components
 */

import { BaseEntity } from "./common";

// ============================================
// Handover Documents
// ============================================

export interface HandoverDocument extends BaseEntity {
  project_id: string;
  tenant_id?: string | null;
  category: string;
  document_name: string;
  file_url?: string | null;
  file_path?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  description?: string | null;
  status?: "pending" | "approved" | "rejected" | null;
  source_type?: "upload" | "tenant_link" | "generated" | null;
  source_id?: string | null;
  uploaded_by?: string | null;
  tenant?: TenantBasic | null;
}

export interface TenantBasic {
  id: string;
  shop_number?: string | null;
  tenant_name?: string | null;
  trading_name?: string | null;
}

// ============================================
// Client Documents
// ============================================

export interface ClientDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_url?: string | null;
  file_path?: string | null;
  created_at: string;
  category?: string | null;
  subcategory?: string | null;
  notes?: string | null;
  is_shared?: boolean;
}

export interface DocumentCategory {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

// ============================================
// Reports
// ============================================

export interface SavedReport extends BaseEntity {
  project_id: string;
  report_name: string;
  report_type: string;
  file_path?: string | null;
  file_url?: string | null;
  generated_at: string;
  generated_by?: string | null;
  revision?: string | null;
  comments?: string | null;
  tenant_count?: number | null;
  total_area?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface CostReport extends BaseEntity {
  project_id: string;
  project_name?: string | null;
  report_date?: string | null;
  total_budget?: number | null;
  total_actual?: number | null;
  variance?: number | null;
  status?: string | null;
}

export interface BulkServicesReport {
  id: string;
  document_id: string;
  project_id: string;
  file_path: string;
  revision: string;
  generated_at: string;
  comments?: string | null;
}

// ============================================
// Approval Workflows
// ============================================

export interface ApprovalWorkflow extends BaseEntity {
  project_id: string;
  document_id: string;
  document_type: string;
  status: "pending" | "approved" | "rejected" | "revision_requested";
  submitted_by: string;
  submitted_at: string;
  approver_id: string;
  reviewed_at?: string | null;
  comments?: string | null;
}

export interface ApprovalUpdate {
  status: ApprovalWorkflow["status"];
  reviewed_at?: string;
  comments?: string;
}

// ============================================
// Performance Goals (HR)
// ============================================

export interface PerformanceGoal extends BaseEntity {
  employee_id: string;
  title: string;
  description?: string | null;
  target_date?: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  progress?: number | null;
  category?: string | null;
  priority?: "low" | "medium" | "high" | null;
}

// ============================================
// Client Access
// ============================================

export interface ClientAccess extends BaseEntity {
  user_id: string;
  project_id: string;
  access_level: "view" | "comment" | "approve";
  granted_by: string;
  expires_at?: string | null;
  is_active: boolean;
  client_report_permissions?: ClientReportPermission[];
  profiles?: {
    email?: string | null;
    full_name?: string | null;
  } | null;
  projects?: {
    name?: string | null;
    project_number?: string | null;
  } | null;
}

export interface ClientReportPermission {
  id: string;
  access_id: string;
  report_type: string;
  can_view: boolean;
  can_download: boolean;
  can_comment: boolean;
}

// ============================================
// Helper Types
// ============================================

export type DocumentStatus = "draft" | "pending" | "approved" | "rejected";
export type ReportFormat = "pdf" | "excel" | "word" | "csv";

export interface DownloadOptions {
  format?: ReportFormat;
  includeMetadata?: boolean;
}
