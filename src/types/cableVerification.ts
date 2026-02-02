/**
 * Cable Schedule Verification Types
 * Types for the electrician verification portal system
 */

// Token and Access Types
export interface CableVerificationToken {
  id: string;
  schedule_id: string;
  project_id: string;
  token: string;
  electrician_name: string;
  electrician_email: string;
  company_name: string | null;
  registration_number: string | null;
  expires_at: string;
  accessed_at: string | null;
  access_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CableVerification {
  id: string;
  token_id: string;
  schedule_id: string;
  status: VerificationStatus;
  started_at: string | null;
  completed_at: string | null;
  overall_notes: string | null;
  signoff_name: string | null;
  signoff_position: string | null;
  signoff_company: string | null;
  signoff_registration: string | null;
  signoff_date: string | null;
  authorization_confirmed: boolean;
  signature_image_url: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface CableVerificationItem {
  id: string;
  verification_id: string;
  cable_entry_id: string;
  status: VerificationItemStatus;
  notes: string | null;
  photo_urls: string[] | null;
  verified_at: string | null;
  measured_length_actual: number | null;
  created_at: string;
  updated_at: string;
}

// Status Types
export type VerificationStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'verified' 
  | 'issues_found' 
  | 'rejected';

export type VerificationItemStatus = 
  | 'pending' 
  | 'verified' 
  | 'issue' 
  | 'not_installed';

// Form Types
export interface CreateVerificationTokenForm {
  electrician_name: string;
  electrician_email: string;
  company_name?: string;
  registration_number?: string;
  expiry_days: string;
  send_email: boolean;
}

export interface ElectricianCredentialsForm {
  name: string;
  position: string;
  company: string;
  registration_number?: string;
  authorization_confirmed: boolean;
}

// Portal Context Types
export interface VerificationPortalData {
  valid: boolean;
  error?: string;
  token_id: string;
  verification_id: string;
  schedule: {
    id: string;
    name: string;
    revision: string | null;
    area_name: string | null;
  };
  project: {
    id: string;
    name: string;
    project_number: string | null;
  };
  electrician: {
    name: string;
    email: string;
    company: string | null;
    registration: string | null;
  };
  verification_status: VerificationStatus;
  cable_count: number;
  expires_at: string;
}

// Cable Entry for verification display
export interface CableEntryForVerification {
  id: string;
  cable_tag: string;
  from_location: string | null;
  to_location: string | null;
  cable_size: string | null;
  core_count: string | null;
  cable_type: string | null;
  voltage: string | null;
  total_length: number | null;
  measured_length: number | null;
  extra_length: number | null;
  load_amps: number | null;
  // Verification item data (joined)
  verification_status?: VerificationItemStatus;
  verification_notes?: string | null;
  verification_photos?: string[] | null;
  verification_measured_length?: number | null;
}

// Statistics
export interface VerificationStats {
  total: number;
  pending: number;
  verified: number;
  issues: number;
  not_installed: number;
  completion_percentage: number;
}

// Token with related data for history view
export interface VerificationTokenWithDetails extends CableVerificationToken {
  verification?: CableVerification | null;
  schedule?: {
    name: string;
    revision: string | null;
  };
}
