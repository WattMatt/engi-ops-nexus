export interface ExtractedLightingData {
  manufacturer: string | null;
  model_name: string | null;
  wattage: number | null;
  lumen_output: number | null;
  color_temperature: number | null;
  cri: number | null;
  beam_angle: number | null;
  ip_rating: string | null;
  ik_rating: string | null;
  dimensions: {
    length: number;
    width: number;
    height: number;
  } | null;
  weight: string | null;
  lifespan_hours: number | null;
  dimmable: boolean | null;
  driver_type: string | null;
}

export interface ConfidenceScores {
  manufacturer: number;
  model_name: number;
  wattage: number;
  lumen_output: number;
  color_temperature: number;
  cri: number;
  beam_angle: number;
  ip_rating: number;
  ik_rating: number;
  dimensions: number;
  weight: number;
  lifespan_hours: number;
  dimmable: number;
  driver_type: number;
}

export interface SpecSheet {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  fitting_id: string | null;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_data: ExtractedLightingData | null;
  confidence_scores: ConfidenceScores | null;
  extraction_error: string | null;
  uploaded_by: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  specSheetId?: string;
}
