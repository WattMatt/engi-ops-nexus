/**
 * Drawing Management System Types
 */

export interface DrawingCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
  is_tenant_specific: boolean;
}

export interface ProjectDrawing {
  id: string;
  project_id: string;
  drawing_number: string;
  drawing_title: string;
  category: string;
  subcategory?: string;
  tenant_id?: string;
  shop_number?: string;
  file_url?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  current_revision: string;
  revision_date?: string;
  revision_notes?: string;
  status: DrawingStatus;
  issue_date?: string;
  visible_to_client: boolean;
  visible_to_contractor: boolean;
  included_in_handover: boolean;
  roadmap_item_id?: string;
  dropbox_path?: string;
  sort_order: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  tenant?: {
    id: string;
    name: string;
    shop_number?: string;
  };
  category_info?: DrawingCategory;
}

export interface DrawingRevision {
  id: string;
  drawing_id: string;
  revision: string;
  revision_date: string;
  revision_notes?: string;
  file_url?: string;
  file_path?: string;
  file_size?: number;
  revised_by?: string;
  created_at: string;
}

export type DrawingStatus = 
  | 'draft'
  | 'issued_for_construction'
  | 'as_built'
  | 'superseded';

export const DRAWING_STATUS_OPTIONS: { value: DrawingStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-muted text-muted-foreground' },
  { value: 'issued_for_construction', label: 'Issued for Construction', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'as_built', label: 'As Built', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'superseded', label: 'Superseded', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
];

export interface DrawingFormData {
  drawing_number: string;
  drawing_title: string;
  category: string;
  subcategory?: string;
  tenant_id?: string;
  shop_number?: string;
  current_revision?: string;
  revision_date?: string;
  revision_notes?: string;
  status?: DrawingStatus;
  issue_date?: string;
  visible_to_client?: boolean;
  visible_to_contractor?: boolean;
  included_in_handover?: boolean;
  notes?: string;
}

export interface DrawingFilters {
  category?: string;
  status?: DrawingStatus;
  tenant_id?: string;
  search?: string;
  visible_to_client?: boolean;
  visible_to_contractor?: boolean;
}

export interface DrawingStats {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  withFiles: number;
  withoutFiles: number;
}

// Utility functions for drawing number parsing
// Supports both "/" and "." as delimiters (e.g., 636/E/001 or 652.E.408)
export const DRAWING_PATTERNS = {
  // Standard: 636/E/001 or 652.E.408
  STANDARD: /^(\d+)[\/.]([A-Z])[\/.](\d+)$/,
  // With suffix: 636/E/407/L, 636/E/407/P1 or 652.E.407.L
  SUFFIX: /^(\d+)[\/.]([A-Z])[\/.](\d+)[\/.]([A-Z]\d?)$/,
  // Tenant with letter: 636/E/4CM, 636/E/4PA/L or 652.E.4CM
  TENANT: /^(\d+)[\/.]([A-Z])[\/.]4([A-Z]+)(?:[\/.]([A-Z]))?$/,
};

/**
 * Normalize drawing number delimiter to "/" for consistent parsing
 */
export function normalizeDrawingNumber(drawingNumber: string): string {
  return drawingNumber.replace(/\./g, '/');
}

/**
 * Split drawing number by either "/" or "." delimiter
 */
function splitDrawingNumber(drawingNumber: string): string[] {
  return drawingNumber.split(/[\/.]/).filter(Boolean);
}

export function detectDrawingCategory(drawingNumber: string): string {
  const parts = splitDrawingNumber(drawingNumber);
  if (parts.length < 3) return 'other';
  
  const numPart = parts[2];
  
  // Handle tenant drawings (4XX with letters like 4CM, 4PA)
  if (/^4[A-Za-z]/.test(numPart)) {
    return 'tenant';
  }
  
  // Extract numeric portion
  const num = parseInt(numPart.replace(/[^0-9]/g, ''), 10) || 0;
  
  if (num >= 1 && num < 100) return 'site';
  if (num >= 100 && num < 200) return 'power';
  if (num >= 200 && num < 300) return 'lighting';
  if (num >= 300 && num < 400) return 'schematic';
  if (num >= 400 && num < 500) return 'tenant';
  if (num >= 600 && num < 700) return 'cctv';
  if (num >= 700 && num < 800) return 'hvac';
  if (num >= 800 && num < 900) return 'signage';
  
  return 'other';
}

export function parseDrawingNumber(drawingNumber: string): {
  projectCode: string;
  discipline: string;
  number: string;
  suffix?: string;
} | null {
  // Try standard pattern first
  let match = drawingNumber.match(DRAWING_PATTERNS.STANDARD);
  if (match) {
    return {
      projectCode: match[1],
      discipline: match[2],
      number: match[3],
    };
  }
  
  // Try suffix pattern
  match = drawingNumber.match(DRAWING_PATTERNS.SUFFIX);
  if (match) {
    return {
      projectCode: match[1],
      discipline: match[2],
      number: match[3],
      suffix: match[4],
    };
  }
  
  // Try tenant pattern
  match = drawingNumber.match(DRAWING_PATTERNS.TENANT);
  if (match) {
    return {
      projectCode: match[1],
      discipline: match[2],
      number: '4' + match[3],
      suffix: match[4],
    };
  }
  
  return null;
}

export function naturalSortDrawings(a: ProjectDrawing, b: ProjectDrawing): number {
  // Natural sort for drawing numbers like 636/E/001, 636/E/100 or 652.E.408
  const aParts = splitDrawingNumber(a.drawing_number);
  const bParts = splitDrawingNumber(b.drawing_number);
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || '';
    const bPart = bParts[i] || '';
    
    // Try numeric comparison first
    const aNum = parseInt(aPart, 10);
    const bNum = parseInt(bPart, 10);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
    } else {
      // String comparison
      const cmp = aPart.localeCompare(bPart);
      if (cmp !== 0) return cmp;
    }
  }
  
  return 0;
}
