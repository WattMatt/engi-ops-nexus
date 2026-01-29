/**
 * Drawing Checklist System Types
 */

export interface DrawingChecklistTemplate {
  id: string;
  category_code: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DrawingChecklistItem {
  id: string;
  template_id: string;
  label: string;
  parent_id?: string | null;
  linked_document_type?: string | null;
  sort_order: number;
  created_at: string;
  // Computed for hierarchy display
  children?: DrawingChecklistItem[];
}

export interface DrawingReviewStatus {
  id: string;
  drawing_id: string;
  template_id?: string | null;
  reviewed_by?: string | null;
  review_date?: string | null;
  status: DrawingReviewStatusType;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type DrawingReviewStatusType = 'pending' | 'in_progress' | 'completed' | 'approved';

export const REVIEW_STATUS_OPTIONS: { value: DrawingReviewStatusType; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-muted text-muted-foreground' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
];

export interface DrawingReviewCheck {
  id: string;
  review_id: string;
  item_id: string;
  is_checked: boolean;
  notes?: string | null;
  checked_at?: string | null;
  checked_by?: string | null;
}

export interface ChecklistProgress {
  total: number;
  checked: number;
  percentage: number;
}

export const DOCUMENT_LINK_TYPES = [
  { value: 'lighting_schedule', label: 'Lighting Schedule' },
  { value: 'scope_of_work', label: 'Scope of Work' },
  { value: 'db_elevation', label: 'DB Elevation' },
  { value: 'schematic_diagram', label: 'Schematic Diagram' },
  { value: 'cable_schedule', label: 'Cable Schedule' },
  { value: 'equipment_spec', label: 'Equipment Specification' },
] as const;

// Helper to build hierarchy from flat list
export function buildChecklistHierarchy(items: DrawingChecklistItem[]): DrawingChecklistItem[] {
  const itemMap = new Map<string, DrawingChecklistItem>();
  const rootItems: DrawingChecklistItem[] = [];
  
  // First pass: create map of all items with empty children array
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });
  
  // Second pass: build hierarchy
  items.forEach(item => {
    const mappedItem = itemMap.get(item.id)!;
    if (item.parent_id && itemMap.has(item.parent_id)) {
      itemMap.get(item.parent_id)!.children!.push(mappedItem);
    } else {
      rootItems.push(mappedItem);
    }
  });
  
  // Sort by sort_order at each level
  const sortItems = (arr: DrawingChecklistItem[]) => {
    arr.sort((a, b) => a.sort_order - b.sort_order);
    arr.forEach(item => {
      if (item.children?.length) {
        sortItems(item.children);
      }
    });
  };
  
  sortItems(rootItems);
  return rootItems;
}
