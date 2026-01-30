export interface HandoverFolder {
  id: string;
  project_id: string;
  parent_folder_id: string | null;
  folder_name: string;
  document_category: string;
  folder_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HandoverDocument {
  id: string;
  project_id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  source_type: string;
  source_id: string | null;
  file_size: number | null;
  added_by: string | null;
  notes: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  tenants?: {
    shop_number: string;
    shop_name: string;
  };
}

export interface FolderTreeNode extends HandoverFolder {
  children: FolderTreeNode[];
  documents: HandoverDocument[];
}
