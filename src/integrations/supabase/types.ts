export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      application_reviews: {
        Row: {
          created_at: string
          focus_areas: string[]
          id: string
          overall_score: number
          review_data: Json
          review_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          focus_areas: string[]
          id?: string
          overall_score: number
          review_data: Json
          review_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          focus_areas?: string[]
          id?: string
          overall_score?: number
          review_data?: Json
          review_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_workflows: {
        Row: {
          approver_id: string
          comments: string | null
          created_at: string
          document_id: string
          document_type: string
          id: string
          project_id: string
          reviewed_at: string | null
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          approver_id: string
          comments?: string | null
          created_at?: string
          document_id: string
          document_type: string
          id?: string
          project_id: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          approver_id?: string
          comments?: string | null
          created_at?: string
          document_id?: string
          document_type?: string
          id?: string
          project_id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          break_end: string | null
          break_start: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          record_date: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          record_date: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          record_date?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_files: {
        Row: {
          backup_id: string | null
          bucket_name: string | null
          checksum: string | null
          compression_type: string | null
          created_at: string | null
          encryption_enabled: boolean | null
          expires_at: string | null
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
        }
        Insert: {
          backup_id?: string | null
          bucket_name?: string | null
          checksum?: string | null
          compression_type?: string | null
          created_at?: string | null
          encryption_enabled?: boolean | null
          expires_at?: string | null
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
        }
        Update: {
          backup_id?: string | null
          bucket_name?: string | null
          checksum?: string | null
          compression_type?: string | null
          created_at?: string | null
          encryption_enabled?: boolean | null
          expires_at?: string | null
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_files_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backup_history"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_health_checks: {
        Row: {
          backup_id: string | null
          check_type: string | null
          checked_at: string | null
          details: Json | null
          id: string
          status: string | null
        }
        Insert: {
          backup_id?: string | null
          check_type?: string | null
          checked_at?: string | null
          details?: Json | null
          id?: string
          status?: string | null
        }
        Update: {
          backup_id?: string | null
          check_type?: string | null
          checked_at?: string | null
          details?: Json | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_health_checks_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backup_history"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_history: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          job_id: string | null
          metadata: Json | null
          records_count: Json | null
          started_at: string | null
          status: string
          tables_included: string[] | null
        }
        Insert: {
          backup_type: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          records_count?: Json | null
          started_at?: string | null
          status: string
          tables_included?: string[] | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          records_count?: Json | null
          started_at?: string | null
          status?: string
          tables_included?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "backup_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_jobs: {
        Row: {
          backup_type: string
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          retention_days: number | null
          schedule_cron: string | null
          storage_config: Json | null
          storage_provider: string | null
          updated_at: string | null
        }
        Insert: {
          backup_type: string
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          retention_days?: number | null
          schedule_cron?: string | null
          storage_config?: Json | null
          storage_provider?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_type?: string
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          retention_days?: number | null
          schedule_cron?: string | null
          storage_config?: Json | null
          storage_provider?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      benefits: {
        Row: {
          category: string
          cost_employee: number | null
          cost_employer: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          provider: string | null
          updated_at: string
        }
        Insert: {
          category: string
          cost_employee?: number | null
          cost_employer?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          provider?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          cost_employee?: number | null
          cost_employer?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      boq_extracted_items: {
        Row: {
          added_material_id: string | null
          added_to_master: boolean | null
          bill_name: string | null
          bill_number: number | null
          created_at: string | null
          extraction_notes: string | null
          id: string
          install_cost: number | null
          install_rate: number | null
          is_rate_only: boolean | null
          item_code: string | null
          item_description: string
          match_confidence: number | null
          matched_material_id: string | null
          prime_cost: number | null
          profit_percentage: number | null
          quantity: number | null
          raw_data: Json | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          row_number: number | null
          section_code: string | null
          section_name: string | null
          suggested_category_id: string | null
          suggested_category_name: string | null
          supply_cost: number | null
          supply_rate: number | null
          total_rate: number | null
          unit: string | null
          upload_id: string
        }
        Insert: {
          added_material_id?: string | null
          added_to_master?: boolean | null
          bill_name?: string | null
          bill_number?: number | null
          created_at?: string | null
          extraction_notes?: string | null
          id?: string
          install_cost?: number | null
          install_rate?: number | null
          is_rate_only?: boolean | null
          item_code?: string | null
          item_description: string
          match_confidence?: number | null
          matched_material_id?: string | null
          prime_cost?: number | null
          profit_percentage?: number | null
          quantity?: number | null
          raw_data?: Json | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          row_number?: number | null
          section_code?: string | null
          section_name?: string | null
          suggested_category_id?: string | null
          suggested_category_name?: string | null
          supply_cost?: number | null
          supply_rate?: number | null
          total_rate?: number | null
          unit?: string | null
          upload_id: string
        }
        Update: {
          added_material_id?: string | null
          added_to_master?: boolean | null
          bill_name?: string | null
          bill_number?: number | null
          created_at?: string | null
          extraction_notes?: string | null
          id?: string
          install_cost?: number | null
          install_rate?: number | null
          is_rate_only?: boolean | null
          item_code?: string | null
          item_description?: string
          match_confidence?: number | null
          matched_material_id?: string | null
          prime_cost?: number | null
          profit_percentage?: number | null
          quantity?: number | null
          raw_data?: Json | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          row_number?: number | null
          section_code?: string | null
          section_name?: string | null
          suggested_category_id?: string | null
          suggested_category_name?: string | null
          supply_cost?: number | null
          supply_rate?: number | null
          total_rate?: number | null
          unit?: string | null
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boq_extracted_items_added_material_id_fkey"
            columns: ["added_material_id"]
            isOneToOne: false
            referencedRelation: "master_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_extracted_items_matched_material_id_fkey"
            columns: ["matched_material_id"]
            isOneToOne: false
            referencedRelation: "master_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_extracted_items_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_extracted_items_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "boq_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_sections: {
        Row: {
          category_mapping_id: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_standard: boolean | null
          section_code: string
          section_name: string
        }
        Insert: {
          category_mapping_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_standard?: boolean | null
          section_code: string
          section_name: string
        }
        Update: {
          category_mapping_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_standard?: boolean | null
          section_code?: string
          section_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "boq_sections_category_mapping_id_fkey"
            columns: ["category_mapping_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_uploads: {
        Row: {
          building_type: string | null
          contractor_name: string | null
          created_at: string | null
          error_message: string | null
          extraction_completed_at: string | null
          extraction_started_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          items_added_to_master: number | null
          items_matched_to_master: number | null
          project_id: string | null
          province: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_description: string | null
          status: string | null
          tender_date: string | null
          total_items_extracted: number | null
          uploaded_by: string
        }
        Insert: {
          building_type?: string | null
          contractor_name?: string | null
          created_at?: string | null
          error_message?: string | null
          extraction_completed_at?: string | null
          extraction_started_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          items_added_to_master?: number | null
          items_matched_to_master?: number | null
          project_id?: string | null
          province?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_description?: string | null
          status?: string | null
          tender_date?: string | null
          total_items_extracted?: number | null
          uploaded_by: string
        }
        Update: {
          building_type?: string | null
          contractor_name?: string | null
          created_at?: string | null
          error_message?: string | null
          extraction_completed_at?: string | null
          extraction_started_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          items_added_to_master?: number | null
          items_matched_to_master?: number | null
          project_id?: string | null
          province?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_description?: string | null
          status?: string | null
          tender_date?: string | null
          total_items_extracted?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "boq_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_items: {
        Row: {
          area: number | null
          area_unit: string | null
          base_rate: number | null
          created_at: string
          description: string
          display_order: number
          id: string
          is_tenant_item: boolean | null
          item_number: string | null
          master_material_id: string | null
          master_rate_id: string | null
          override_reason: string | null
          rate_overridden: boolean | null
          section_id: string
          shop_number: string | null
          tenant_id: string | null
          ti_rate: number | null
          total: number
          updated_at: string
        }
        Insert: {
          area?: number | null
          area_unit?: string | null
          base_rate?: number | null
          created_at?: string
          description: string
          display_order?: number
          id?: string
          is_tenant_item?: boolean | null
          item_number?: string | null
          master_material_id?: string | null
          master_rate_id?: string | null
          override_reason?: string | null
          rate_overridden?: boolean | null
          section_id: string
          shop_number?: string | null
          tenant_id?: string | null
          ti_rate?: number | null
          total?: number
          updated_at?: string
        }
        Update: {
          area?: number | null
          area_unit?: string | null
          base_rate?: number | null
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_tenant_item?: boolean | null
          item_number?: string | null
          master_material_id?: string | null
          master_rate_id?: string | null
          override_reason?: string | null
          rate_overridden?: boolean | null
          section_id?: string
          shop_number?: string | null
          tenant_id?: string | null
          ti_rate?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_master_material_id_fkey"
            columns: ["master_material_id"]
            isOneToOne: false
            referencedRelation: "master_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_master_rate_id_fkey"
            columns: ["master_rate_id"]
            isOneToOne: false
            referencedRelation: "master_rate_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_sections: {
        Row: {
          budget_id: string
          created_at: string
          display_order: number
          id: string
          section_code: string
          section_name: string
          updated_at: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          display_order?: number
          id?: string
          section_code: string
          section_name: string
          updated_at?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          display_order?: number
          id?: string
          section_code?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulk_services_documents: {
        Row: {
          ai_guidance_parameters: Json | null
          architect: string | null
          building_calculation_type: string | null
          client_name: string | null
          client_representative: string | null
          climatic_zone: string | null
          climatic_zone_city: string | null
          climatic_zone_lat: number | null
          climatic_zone_lng: number | null
          connection_size: string | null
          created_at: string
          created_by: string
          diversity_factor: number | null
          document_date: string
          document_number: string
          drawing_file_path: string | null
          drawing_markup_data: Json | null
          electrical_standard: string | null
          future_expansion_factor: number | null
          id: string
          load_category: string | null
          maximum_demand: number | null
          notes: string | null
          prepared_by: string | null
          prepared_by_contact: string | null
          primary_voltage: string | null
          project_area: number | null
          project_description: string | null
          project_id: string
          revision: string
          supply_authority: string | null
          tariff_structure: string | null
          total_connected_load: number | null
          updated_at: string
          va_per_sqm: number | null
        }
        Insert: {
          ai_guidance_parameters?: Json | null
          architect?: string | null
          building_calculation_type?: string | null
          client_name?: string | null
          client_representative?: string | null
          climatic_zone?: string | null
          climatic_zone_city?: string | null
          climatic_zone_lat?: number | null
          climatic_zone_lng?: number | null
          connection_size?: string | null
          created_at?: string
          created_by: string
          diversity_factor?: number | null
          document_date?: string
          document_number: string
          drawing_file_path?: string | null
          drawing_markup_data?: Json | null
          electrical_standard?: string | null
          future_expansion_factor?: number | null
          id?: string
          load_category?: string | null
          maximum_demand?: number | null
          notes?: string | null
          prepared_by?: string | null
          prepared_by_contact?: string | null
          primary_voltage?: string | null
          project_area?: number | null
          project_description?: string | null
          project_id: string
          revision?: string
          supply_authority?: string | null
          tariff_structure?: string | null
          total_connected_load?: number | null
          updated_at?: string
          va_per_sqm?: number | null
        }
        Update: {
          ai_guidance_parameters?: Json | null
          architect?: string | null
          building_calculation_type?: string | null
          client_name?: string | null
          client_representative?: string | null
          climatic_zone?: string | null
          climatic_zone_city?: string | null
          climatic_zone_lat?: number | null
          climatic_zone_lng?: number | null
          connection_size?: string | null
          created_at?: string
          created_by?: string
          diversity_factor?: number | null
          document_date?: string
          document_number?: string
          drawing_file_path?: string | null
          drawing_markup_data?: Json | null
          electrical_standard?: string | null
          future_expansion_factor?: number | null
          id?: string
          load_category?: string | null
          maximum_demand?: number | null
          notes?: string | null
          prepared_by?: string | null
          prepared_by_contact?: string | null
          primary_voltage?: string | null
          project_area?: number | null
          project_description?: string | null
          project_id?: string
          revision?: string
          supply_authority?: string | null
          tariff_structure?: string | null
          total_connected_load?: number | null
          updated_at?: string
          va_per_sqm?: number | null
        }
        Relationships: []
      }
      bulk_services_reports: {
        Row: {
          comments: string | null
          document_id: string
          file_path: string
          generated_at: string
          id: string
          project_id: string
          revision: string
        }
        Insert: {
          comments?: string | null
          document_id: string
          file_path: string
          generated_at?: string
          id?: string
          project_id: string
          revision: string
        }
        Update: {
          comments?: string | null
          document_id?: string
          file_path?: string
          generated_at?: string
          id?: string
          project_id?: string
          revision?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_services_reports_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "bulk_services_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_services_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_services_sections: {
        Row: {
          content: string | null
          created_at: string
          document_id: string
          id: string
          section_number: string
          section_title: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          document_id: string
          id?: string
          section_number: string
          section_title: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          document_id?: string
          id?: string
          section_number?: string
          section_title?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      bulk_services_tutorial_progress: {
        Row: {
          calculation_type: string
          created_at: string | null
          current_step: number
          document_id: string
          form_data: Json
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calculation_type: string
          created_at?: string | null
          current_step?: number
          document_id: string
          form_data?: Json
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calculation_type?: string
          created_at?: string | null
          current_step?: number
          document_id?: string
          form_data?: Json
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_services_tutorial_progress_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "bulk_services_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      cable_calculation_settings: {
        Row: {
          ambient_temp_baseline: number | null
          cable_safety_margin: number | null
          calculation_standard: string | null
          created_at: string | null
          default_cable_material: string | null
          default_core_configuration: string | null
          default_installation_method: string | null
          default_insulation_type: string | null
          derating_temp_correction: Json | null
          grouping_factor_2_circuits: number | null
          grouping_factor_3_circuits: number | null
          grouping_factor_4plus_circuits: number | null
          id: string
          k_factor_aluminium: number | null
          k_factor_copper: number | null
          max_amps_per_cable: number | null
          power_factor_hvac: number | null
          power_factor_lighting: number | null
          power_factor_motor: number | null
          power_factor_power: number | null
          preferred_amps_per_cable: number | null
          project_id: string
          thermal_insulation_factor_default: number | null
          updated_at: string | null
          voltage_drop_limit_230v: number | null
          voltage_drop_limit_400v: number | null
        }
        Insert: {
          ambient_temp_baseline?: number | null
          cable_safety_margin?: number | null
          calculation_standard?: string | null
          created_at?: string | null
          default_cable_material?: string | null
          default_core_configuration?: string | null
          default_installation_method?: string | null
          default_insulation_type?: string | null
          derating_temp_correction?: Json | null
          grouping_factor_2_circuits?: number | null
          grouping_factor_3_circuits?: number | null
          grouping_factor_4plus_circuits?: number | null
          id?: string
          k_factor_aluminium?: number | null
          k_factor_copper?: number | null
          max_amps_per_cable?: number | null
          power_factor_hvac?: number | null
          power_factor_lighting?: number | null
          power_factor_motor?: number | null
          power_factor_power?: number | null
          preferred_amps_per_cable?: number | null
          project_id: string
          thermal_insulation_factor_default?: number | null
          updated_at?: string | null
          voltage_drop_limit_230v?: number | null
          voltage_drop_limit_400v?: number | null
        }
        Update: {
          ambient_temp_baseline?: number | null
          cable_safety_margin?: number | null
          calculation_standard?: string | null
          created_at?: string | null
          default_cable_material?: string | null
          default_core_configuration?: string | null
          default_installation_method?: string | null
          default_insulation_type?: string | null
          derating_temp_correction?: Json | null
          grouping_factor_2_circuits?: number | null
          grouping_factor_3_circuits?: number | null
          grouping_factor_4plus_circuits?: number | null
          id?: string
          k_factor_aluminium?: number | null
          k_factor_copper?: number | null
          max_amps_per_cable?: number | null
          power_factor_hvac?: number | null
          power_factor_lighting?: number | null
          power_factor_motor?: number | null
          power_factor_power?: number | null
          preferred_amps_per_cable?: number | null
          project_id?: string
          thermal_insulation_factor_default?: number | null
          updated_at?: string | null
          voltage_drop_limit_230v?: number | null
          voltage_drop_limit_400v?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cable_calculation_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cable_entries: {
        Row: {
          ambient_temperature: number | null
          base_cable_tag: string | null
          cable_number: number | null
          cable_size: string | null
          cable_tag: string
          cable_type: string | null
          calculation_method: string | null
          circuit_type: string | null
          core_configuration: string | null
          created_at: string
          created_from: string | null
          display_order: number
          earth_fault_loop_impedance: number | null
          extra_length: number | null
          fault_level: number | null
          floor_plan_cable_id: string | null
          floor_plan_id: string | null
          from_location: string
          grouping_factor: number | null
          id: string
          install_cost: number | null
          installation_method: string
          insulation_type: string | null
          load_amps: number | null
          max_demand_factor: number | null
          measured_length: number | null
          notes: string | null
          number_of_phases: number | null
          ohm_per_km: number | null
          parallel_group_id: string | null
          parallel_total_count: number | null
          power_factor: number | null
          protection_device_rating: number | null
          quantity: number
          schedule_id: string | null
          starting_current: number | null
          supply_cost: number | null
          thermal_insulation_factor: number | null
          to_location: string
          total_cost: number | null
          total_length: number | null
          updated_at: string
          volt_drop: number | null
          voltage: number | null
          voltage_drop_limit: number | null
        }
        Insert: {
          ambient_temperature?: number | null
          base_cable_tag?: string | null
          cable_number?: number | null
          cable_size?: string | null
          cable_tag: string
          cable_type?: string | null
          calculation_method?: string | null
          circuit_type?: string | null
          core_configuration?: string | null
          created_at?: string
          created_from?: string | null
          display_order?: number
          earth_fault_loop_impedance?: number | null
          extra_length?: number | null
          fault_level?: number | null
          floor_plan_cable_id?: string | null
          floor_plan_id?: string | null
          from_location: string
          grouping_factor?: number | null
          id?: string
          install_cost?: number | null
          installation_method?: string
          insulation_type?: string | null
          load_amps?: number | null
          max_demand_factor?: number | null
          measured_length?: number | null
          notes?: string | null
          number_of_phases?: number | null
          ohm_per_km?: number | null
          parallel_group_id?: string | null
          parallel_total_count?: number | null
          power_factor?: number | null
          protection_device_rating?: number | null
          quantity?: number
          schedule_id?: string | null
          starting_current?: number | null
          supply_cost?: number | null
          thermal_insulation_factor?: number | null
          to_location: string
          total_cost?: number | null
          total_length?: number | null
          updated_at?: string
          volt_drop?: number | null
          voltage?: number | null
          voltage_drop_limit?: number | null
        }
        Update: {
          ambient_temperature?: number | null
          base_cable_tag?: string | null
          cable_number?: number | null
          cable_size?: string | null
          cable_tag?: string
          cable_type?: string | null
          calculation_method?: string | null
          circuit_type?: string | null
          core_configuration?: string | null
          created_at?: string
          created_from?: string | null
          display_order?: number
          earth_fault_loop_impedance?: number | null
          extra_length?: number | null
          fault_level?: number | null
          floor_plan_cable_id?: string | null
          floor_plan_id?: string | null
          from_location?: string
          grouping_factor?: number | null
          id?: string
          install_cost?: number | null
          installation_method?: string
          insulation_type?: string | null
          load_amps?: number | null
          max_demand_factor?: number | null
          measured_length?: number | null
          notes?: string | null
          number_of_phases?: number | null
          ohm_per_km?: number | null
          parallel_group_id?: string | null
          parallel_total_count?: number | null
          power_factor?: number | null
          protection_device_rating?: number | null
          quantity?: number
          schedule_id?: string | null
          starting_current?: number | null
          supply_cost?: number | null
          thermal_insulation_factor?: number | null
          to_location?: string
          total_cost?: number | null
          total_length?: number | null
          updated_at?: string
          volt_drop?: number | null
          voltage?: number | null
          voltage_drop_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cable_entries_floor_plan_cable_id_fkey"
            columns: ["floor_plan_cable_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_entries_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cable_rates: {
        Row: {
          cable_size: string
          cable_type: string
          created_at: string
          id: string
          install_rate_per_meter: number
          project_id: string
          supply_rate_per_meter: number
          termination_cost_per_end: number
          updated_at: string
        }
        Insert: {
          cable_size: string
          cable_type: string
          created_at?: string
          id?: string
          install_rate_per_meter?: number
          project_id: string
          supply_rate_per_meter?: number
          termination_cost_per_end?: number
          updated_at?: string
        }
        Update: {
          cable_size?: string
          cable_type?: string
          created_at?: string
          id?: string
          install_rate_per_meter?: number
          project_id?: string
          supply_rate_per_meter?: number
          termination_cost_per_end?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cable_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cable_schedule_reports: {
        Row: {
          created_at: string
          file_path: string
          file_size: number | null
          generated_at: string
          generated_by: string | null
          id: string
          notes: string | null
          report_name: string
          revision: string
          schedule_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          report_name: string
          revision: string
          schedule_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          report_name?: string
          revision?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cable_schedule_reports_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "cable_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      cable_schedules: {
        Row: {
          created_at: string
          created_by: string
          id: string
          layout_name: string | null
          notes: string | null
          project_id: string
          revision: string
          schedule_date: string
          schedule_name: string
          schedule_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          layout_name?: string | null
          notes?: string | null
          project_id: string
          revision?: string
          schedule_date: string
          schedule_name: string
          schedule_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          layout_name?: string | null
          notes?: string | null
          project_id?: string
          revision?: string
          schedule_date?: string
          schedule_name?: string
          schedule_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_approvals: {
        Row: {
          approval_status: string
          approved_at: string | null
          id: string
          notes: string | null
          project_id: string
          report_type: string
          report_version: string | null
          signature_data: string | null
          user_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          id?: string
          notes?: string | null
          project_id: string
          report_type: string
          report_version?: string | null
          signature_data?: string | null
          user_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          report_type?: string
          report_version?: string | null
          signature_data?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          parent_comment_id: string | null
          project_id: string
          reference_id: string | null
          report_type: string
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          parent_comment_id?: string | null
          project_id: string
          reference_id?: string | null
          report_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          parent_comment_id?: string | null
          project_id?: string
          reference_id?: string | null
          report_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "client_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access_log: {
        Row: {
          accessed_at: string | null
          email: string | null
          id: string
          ip_address: string | null
          project_id: string
          token_id: string | null
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          project_id: string
          token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          project_id?: string
          token_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_access_log_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "client_portal_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_settings: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          link_expiry_hours: number | null
          password_hash: string | null
          project_id: string
          require_email: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          link_expiry_hours?: number | null
          password_hash?: string | null
          project_id: string
          require_email?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          link_expiry_hours?: number | null
          password_hash?: string | null
          project_id?: string
          require_email?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_tokens: {
        Row: {
          access_count: number | null
          accessed_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          project_id: string
          token: string
        }
        Insert: {
          access_count?: number | null
          accessed_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          project_id: string
          token: string
        }
        Update: {
          access_count?: number | null
          accessed_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          project_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_access: {
        Row: {
          created_at: string | null
          granted_by: string | null
          id: string
          project_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          project_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          project_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_report_permissions: {
        Row: {
          can_approve: boolean | null
          can_comment: boolean | null
          can_view: boolean | null
          client_access_id: string
          created_at: string | null
          id: string
          report_type: string
        }
        Insert: {
          can_approve?: boolean | null
          can_comment?: boolean | null
          can_view?: boolean | null
          client_access_id: string
          created_at?: string | null
          id?: string
          report_type: string
        }
        Update: {
          can_approve?: boolean | null
          can_comment?: boolean | null
          can_view?: boolean | null
          client_access_id?: string
          created_at?: string | null
          id?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_report_permissions_client_access_id_fkey"
            columns: ["client_access_id"]
            isOneToOne: false
            referencedRelation: "client_project_access"
            referencedColumns: ["id"]
          },
        ]
      }
      client_requests: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          client_user_id: string
          created_at: string
          description: string
          id: string
          priority: string
          project_id: string
          request_type: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          client_user_id: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          project_id: string
          request_type: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          client_user_id?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          project_id?: string
          request_type?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          client_address_line1: string | null
          client_address_line2: string | null
          client_logo_url: string | null
          client_name: string | null
          client_phone: string | null
          company_logo_url: string | null
          company_name: string
          company_tagline: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          client_address_line1?: string | null
          client_address_line2?: string | null
          client_logo_url?: string | null
          client_name?: string | null
          client_phone?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_tagline?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          client_address_line1?: string | null
          client_address_line2?: string | null
          client_logo_url?: string | null
          client_name?: string | null
          client_phone?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_tagline?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          last_message_at: string | null
          participants: Json
          project_id: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string | null
          participants?: Json
          project_id?: string | null
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string | null
          participants?: Json
          project_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_categories: {
        Row: {
          anticipated_final: number
          code: string
          cost_report_id: string
          created_at: string | null
          description: string
          display_order: number
          id: string
          original_budget: number
          previous_report: number
          updated_at: string | null
        }
        Insert: {
          anticipated_final?: number
          code: string
          cost_report_id: string
          created_at?: string | null
          description: string
          display_order?: number
          id?: string
          original_budget?: number
          previous_report?: number
          updated_at?: string | null
        }
        Update: {
          anticipated_final?: number
          code?: string
          cost_report_id?: string
          created_at?: string | null
          description?: string
          display_order?: number
          id?: string
          original_budget?: number
          previous_report?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_categories_cost_report_id_fkey"
            columns: ["cost_report_id"]
            isOneToOne: false
            referencedRelation: "cost_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_line_items: {
        Row: {
          anticipated_final: number
          category_id: string
          code: string
          created_at: string | null
          description: string
          display_order: number
          id: string
          original_budget: number
          previous_report: number
          updated_at: string | null
        }
        Insert: {
          anticipated_final?: number
          category_id: string
          code: string
          created_at?: string | null
          description: string
          display_order?: number
          id?: string
          original_budget?: number
          previous_report?: number
          updated_at?: string | null
        }
        Update: {
          anticipated_final?: number
          category_id?: string
          code?: string
          created_at?: string | null
          description?: string
          display_order?: number
          id?: string
          original_budget?: number
          previous_report?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_line_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_report_details: {
        Row: {
          cost_report_id: string
          created_at: string | null
          display_order: number
          id: string
          section_content: string | null
          section_number: number
          section_title: string
          updated_at: string | null
        }
        Insert: {
          cost_report_id: string
          created_at?: string | null
          display_order?: number
          id?: string
          section_content?: string | null
          section_number: number
          section_title: string
          updated_at?: string | null
        }
        Update: {
          cost_report_id?: string
          created_at?: string | null
          display_order?: number
          id?: string
          section_content?: string | null
          section_number?: number
          section_title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_report_details_cost_report_id_fkey"
            columns: ["cost_report_id"]
            isOneToOne: false
            referencedRelation: "cost_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_report_pdfs: {
        Row: {
          cost_report_id: string
          file_name: string
          file_path: string
          file_size: number | null
          generated_at: string
          generated_by: string | null
          id: string
          notes: string | null
          page_content_map: Json | null
          project_id: string
          revision: string | null
        }
        Insert: {
          cost_report_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          page_content_map?: Json | null
          project_id: string
          revision?: string | null
        }
        Update: {
          cost_report_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          page_content_map?: Json | null
          project_id?: string
          revision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_report_pdfs_cost_report_id_fkey"
            columns: ["cost_report_id"]
            isOneToOne: false
            referencedRelation: "cost_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_reports: {
        Row: {
          cctv_contractor: string | null
          client_name: string
          created_at: string | null
          created_by: string
          earthing_contractor: string | null
          electrical_contractor: string | null
          id: string
          notes: string | null
          practical_completion_date: string | null
          project_id: string
          project_name: string
          project_number: string
          report_date: string
          report_number: number
          site_handover_date: string | null
          standby_plants_contractor: string | null
          updated_at: string | null
        }
        Insert: {
          cctv_contractor?: string | null
          client_name: string
          created_at?: string | null
          created_by: string
          earthing_contractor?: string | null
          electrical_contractor?: string | null
          id?: string
          notes?: string | null
          practical_completion_date?: string | null
          project_id: string
          project_name: string
          project_number: string
          report_date: string
          report_number: number
          site_handover_date?: string | null
          standby_plants_contractor?: string | null
          updated_at?: string | null
        }
        Update: {
          cctv_contractor?: string | null
          client_name?: string
          created_at?: string | null
          created_by?: string
          earthing_contractor?: string | null
          electrical_contractor?: string | null
          id?: string
          notes?: string | null
          practical_completion_date?: string | null
          project_id?: string
          project_name?: string
          project_number?: string
          report_date?: string
          report_number?: number
          site_handover_date?: string | null
          standby_plants_contractor?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_variation_history: {
        Row: {
          action_type: string
          change_summary: string | null
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          variation_id: string | null
        }
        Insert: {
          action_type: string
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          variation_id?: string | null
        }
        Update: {
          action_type?: string
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_variation_history_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "cost_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_variations: {
        Row: {
          amount: number
          code: string
          cost_report_id: string
          created_at: string | null
          created_by: string | null
          description: string
          display_order: number
          id: string
          is_credit: boolean | null
          tenant_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          code: string
          cost_report_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          display_order?: number
          id?: string
          is_credit?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          code?: string
          cost_report_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          display_order?: number
          id?: string
          is_credit?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_variations_cost_report_id_fkey"
            columns: ["cost_report_id"]
            isOneToOne: false
            referencedRelation: "cost_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_variations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      db_sizing_rules: {
        Row: {
          category: string
          created_at: string
          db_size_allowance: string
          db_size_scope_of_work: string | null
          id: string
          max_area: number
          min_area: number
          project_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          db_size_allowance: string
          db_size_scope_of_work?: string | null
          id?: string
          max_area: number
          min_area: number
          project_id: string
        }
        Update: {
          category?: string
          created_at?: string
          db_size_allowance?: string
          db_size_scope_of_work?: string | null
          id?: string
          max_area?: number
          min_area?: number
          project_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_name: string
          file_url: string
          id: string
          is_active: boolean | null
          is_default_cover: boolean | null
          name: string
          placeholder_schema: Json | null
          preview_pdf_url: string | null
          template_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          is_active?: boolean | null
          is_default_cover?: boolean | null
          name: string
          placeholder_schema?: Json | null
          preview_pdf_url?: string | null
          template_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          is_active?: boolean | null
          is_default_cover?: boolean | null
          name?: string
          placeholder_schema?: Json | null
          preview_pdf_url?: string | null
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      electrical_budgets: {
        Row: {
          budget_date: string
          budget_number: string
          client_logo_url: string | null
          consultant_logo_url: string | null
          created_at: string
          created_by: string
          extraction_status: string | null
          id: string
          notes: string | null
          prepared_by_contact: string | null
          prepared_for_company: string | null
          prepared_for_contact: string | null
          prepared_for_tel: string | null
          project_id: string
          revision: string
          source_file_url: string | null
          updated_at: string
        }
        Insert: {
          budget_date: string
          budget_number: string
          client_logo_url?: string | null
          consultant_logo_url?: string | null
          created_at?: string
          created_by: string
          extraction_status?: string | null
          id?: string
          notes?: string | null
          prepared_by_contact?: string | null
          prepared_for_company?: string | null
          prepared_for_contact?: string | null
          prepared_for_tel?: string | null
          project_id: string
          revision?: string
          source_file_url?: string | null
          updated_at?: string
        }
        Update: {
          budget_date?: string
          budget_number?: string
          client_logo_url?: string | null
          consultant_logo_url?: string | null
          created_at?: string
          created_by?: string
          extraction_status?: string | null
          id?: string
          notes?: string | null
          prepared_by_contact?: string | null
          prepared_for_company?: string | null
          prepared_for_contact?: string | null
          prepared_for_tel?: string | null
          project_id?: string
          revision?: string
          source_file_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_benefits: {
        Row: {
          benefit_id: string
          coverage_end_date: string | null
          coverage_start_date: string
          created_at: string
          dependents: Json | null
          employee_id: string
          enrollment_date: string
          id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          benefit_id: string
          coverage_end_date?: string | null
          coverage_start_date: string
          created_at?: string
          dependents?: Json | null
          employee_id: string
          enrollment_date: string
          id?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          benefit_id?: string
          coverage_end_date?: string | null
          coverage_start_date?: string
          created_at?: string
          dependents?: Json | null
          employee_id?: string
          enrollment_date?: string
          id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_benefits_benefit_id_fkey"
            columns: ["benefit_id"]
            isOneToOne: false
            referencedRelation: "benefits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          document_name: string
          document_type: string
          employee_id: string
          file_url: string
          id: string
          notes: string | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          document_name: string
          document_type: string
          employee_id: string
          file_url: string
          id?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          document_name?: string
          document_type?: string
          employee_id?: string
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_number: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          first_name: string
          hire_date: string
          id: string
          last_name: string
          manager_id: string | null
          phone: string | null
          photo_url: string | null
          position_id: string | null
          postal_code: string | null
          secondary_email: string | null
          secondary_phone: string | null
          staff_id_number: string | null
          state: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_number: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name: string
          hire_date: string
          id?: string
          last_name: string
          manager_id?: string | null
          phone?: string | null
          photo_url?: string | null
          position_id?: string | null
          postal_code?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          staff_id_number?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_number?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name?: string
          hire_date?: string
          id?: string
          last_name?: string
          manager_id?: string | null
          phone?: string | null
          photo_url?: string | null
          position_id?: string | null
          postal_code?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          staff_id_number?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_payroll: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_payroll?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_payroll?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      final_account_bills: {
        Row: {
          bill_name: string
          bill_number: number
          contract_total: number | null
          created_at: string
          description: string | null
          display_order: number | null
          final_account_id: string
          final_total: number | null
          id: string
          updated_at: string
          variation_total: number | null
        }
        Insert: {
          bill_name: string
          bill_number: number
          contract_total?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          final_account_id: string
          final_total?: number | null
          id?: string
          updated_at?: string
          variation_total?: number | null
        }
        Update: {
          bill_name?: string
          bill_number?: number
          contract_total?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          final_account_id?: string
          final_total?: number | null
          id?: string
          updated_at?: string
          variation_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "final_account_bills_final_account_id_fkey"
            columns: ["final_account_id"]
            isOneToOne: false
            referencedRelation: "final_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      final_account_items: {
        Row: {
          contract_amount: number | null
          contract_quantity: number | null
          created_at: string
          description: string
          display_order: number | null
          final_amount: number | null
          final_quantity: number | null
          id: string
          install_rate: number | null
          is_rate_only: boolean | null
          item_code: string
          notes: string | null
          section_id: string
          shop_subsection_id: string | null
          source_boq_item_id: string | null
          supply_rate: number | null
          unit: string | null
          updated_at: string
          variation_amount: number | null
        }
        Insert: {
          contract_amount?: number | null
          contract_quantity?: number | null
          created_at?: string
          description: string
          display_order?: number | null
          final_amount?: number | null
          final_quantity?: number | null
          id?: string
          install_rate?: number | null
          is_rate_only?: boolean | null
          item_code: string
          notes?: string | null
          section_id: string
          shop_subsection_id?: string | null
          source_boq_item_id?: string | null
          supply_rate?: number | null
          unit?: string | null
          updated_at?: string
          variation_amount?: number | null
        }
        Update: {
          contract_amount?: number | null
          contract_quantity?: number | null
          created_at?: string
          description?: string
          display_order?: number | null
          final_amount?: number | null
          final_quantity?: number | null
          id?: string
          install_rate?: number | null
          is_rate_only?: boolean | null
          item_code?: string
          notes?: string | null
          section_id?: string
          shop_subsection_id?: string | null
          source_boq_item_id?: string | null
          supply_rate?: number | null
          unit?: string | null
          updated_at?: string
          variation_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "final_account_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "final_account_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_account_items_shop_subsection_id_fkey"
            columns: ["shop_subsection_id"]
            isOneToOne: false
            referencedRelation: "final_account_shop_subsections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_account_items_source_boq_item_id_fkey"
            columns: ["source_boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_extracted_items"
            referencedColumns: ["id"]
          },
        ]
      }
      final_account_section_comments: {
        Row: {
          author_id: string | null
          author_name: string
          author_type: string
          comment_text: string
          created_at: string
          id: string
          review_id: string | null
          section_id: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          author_type: string
          comment_text: string
          created_at?: string
          id?: string
          review_id?: string | null
          section_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_type?: string
          comment_text?: string
          created_at?: string
          id?: string
          review_id?: string | null
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_account_section_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "final_account_section_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_account_section_comments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "final_account_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      final_account_section_reviews: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          message: string | null
          pdf_url: string | null
          reviewed_at: string | null
          reviewer_contact_id: string | null
          reviewer_email: string | null
          reviewer_name: string | null
          section_id: string
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["section_review_status"]
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          message?: string | null
          pdf_url?: string | null
          reviewed_at?: string | null
          reviewer_contact_id?: string | null
          reviewer_email?: string | null
          reviewer_name?: string | null
          section_id: string
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["section_review_status"]
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          message?: string | null
          pdf_url?: string | null
          reviewed_at?: string | null
          reviewer_contact_id?: string | null
          reviewer_email?: string | null
          reviewer_name?: string | null
          section_id?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["section_review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_account_section_reviews_reviewer_contact_id_fkey"
            columns: ["reviewer_contact_id"]
            isOneToOne: false
            referencedRelation: "project_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_account_section_reviews_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "final_account_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      final_account_sections: {
        Row: {
          bill_id: string
          contract_total: number | null
          created_at: string
          description: string | null
          display_order: number | null
          final_total: number | null
          id: string
          review_status:
            | Database["public"]["Enums"]["section_review_status"]
            | null
          section_code: string
          section_name: string
          updated_at: string
          variation_total: number | null
        }
        Insert: {
          bill_id: string
          contract_total?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          final_total?: number | null
          id?: string
          review_status?:
            | Database["public"]["Enums"]["section_review_status"]
            | null
          section_code: string
          section_name: string
          updated_at?: string
          variation_total?: number | null
        }
        Update: {
          bill_id?: string
          contract_total?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          final_total?: number | null
          id?: string
          review_status?:
            | Database["public"]["Enums"]["section_review_status"]
            | null
          section_code?: string
          section_name?: string
          updated_at?: string
          variation_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "final_account_sections_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "final_account_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      final_account_shop_subsections: {
        Row: {
          contract_total: number
          created_at: string
          display_order: number
          final_total: number
          id: string
          section_id: string
          shop_name: string
          shop_number: string
          updated_at: string
          variation_total: number
        }
        Insert: {
          contract_total?: number
          created_at?: string
          display_order?: number
          final_total?: number
          id?: string
          section_id: string
          shop_name: string
          shop_number: string
          updated_at?: string
          variation_total?: number
        }
        Update: {
          contract_total?: number
          created_at?: string
          display_order?: number
          final_total?: number
          id?: string
          section_id?: string
          shop_name?: string
          shop_number?: string
          updated_at?: string
          variation_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "final_account_shop_subsections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "final_account_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      final_accounts: {
        Row: {
          account_name: string
          account_number: string
          client_name: string | null
          contract_value: number | null
          created_at: string
          created_by: string | null
          final_value: number | null
          id: string
          notes: string | null
          project_id: string
          source_boq_upload_id: string | null
          status: string | null
          submission_date: string | null
          updated_at: string
          variations_total: number | null
        }
        Insert: {
          account_name: string
          account_number: string
          client_name?: string | null
          contract_value?: number | null
          created_at?: string
          created_by?: string | null
          final_value?: number | null
          id?: string
          notes?: string | null
          project_id: string
          source_boq_upload_id?: string | null
          status?: string | null
          submission_date?: string | null
          updated_at?: string
          variations_total?: number | null
        }
        Update: {
          account_name?: string
          account_number?: string
          client_name?: string | null
          contract_value?: number | null
          created_at?: string
          created_by?: string | null
          final_value?: number | null
          id?: string
          notes?: string | null
          project_id?: string
          source_boq_upload_id?: string | null
          status?: string | null
          submission_date?: string | null
          updated_at?: string
          variations_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "final_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_accounts_source_boq_upload_id_fkey"
            columns: ["source_boq_upload_id"]
            isOneToOne: false
            referencedRelation: "boq_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "invoice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_cables: {
        Row: {
          cable_entry_id: string | null
          cable_type: string
          created_at: string
          end_height: number | null
          floor_plan_id: string
          from_label: string | null
          id: string
          label: string | null
          length_meters: number | null
          points: Json
          start_height: number | null
          termination_count: number | null
          to_label: string | null
        }
        Insert: {
          cable_entry_id?: string | null
          cable_type: string
          created_at?: string
          end_height?: number | null
          floor_plan_id: string
          from_label?: string | null
          id?: string
          label?: string | null
          length_meters?: number | null
          points: Json
          start_height?: number | null
          termination_count?: number | null
          to_label?: string | null
        }
        Update: {
          cable_entry_id?: string | null
          cable_type?: string
          created_at?: string
          end_height?: number | null
          floor_plan_id?: string
          from_label?: string | null
          id?: string
          label?: string | null
          length_meters?: number | null
          points?: Json
          start_height?: number | null
          termination_count?: number | null
          to_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_cables_cable_entry_id_fkey"
            columns: ["cable_entry_id"]
            isOneToOne: false
            referencedRelation: "cable_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_cables_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_containment: {
        Row: {
          created_at: string
          floor_plan_id: string
          id: string
          length_meters: number | null
          points: Json
          size: string | null
          type: string
        }
        Insert: {
          created_at?: string
          floor_plan_id: string
          id?: string
          length_meters?: number | null
          points: Json
          size?: string | null
          type: string
        }
        Update: {
          created_at?: string
          floor_plan_id?: string
          id?: string
          length_meters?: number | null
          points?: Json
          size?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_containment_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_equipment: {
        Row: {
          created_at: string
          floor_plan_id: string
          id: string
          label: string | null
          properties: Json | null
          rotation: number | null
          type: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          floor_plan_id: string
          id?: string
          label?: string | null
          properties?: Json | null
          rotation?: number | null
          type: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          floor_plan_id?: string
          id?: string
          label?: string | null
          properties?: Json | null
          rotation?: number | null
          type?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_equipment_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_lighting: {
        Row: {
          created_at: string
          fitting_id: string
          floor_plan_id: string
          id: string
          mounting_height: number | null
          rotation: number | null
          tenant_id: string | null
          updated_at: string
          x_position: number
          y_position: number
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          fitting_id: string
          floor_plan_id: string
          id?: string
          mounting_height?: number | null
          rotation?: number | null
          tenant_id?: string | null
          updated_at?: string
          x_position: number
          y_position: number
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          fitting_id?: string
          floor_plan_id?: string
          id?: string
          mounting_height?: number | null
          rotation?: number | null
          tenant_id?: string | null
          updated_at?: string
          x_position?: number
          y_position?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_lighting_fitting_id_fkey"
            columns: ["fitting_id"]
            isOneToOne: false
            referencedRelation: "lighting_fittings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_lighting_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_lighting_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_projects: {
        Row: {
          created_at: string
          design_purpose: string
          id: string
          name: string
          pdf_url: string | null
          project_id: string | null
          scale_meters_per_pixel: number | null
          state_json: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          design_purpose: string
          id?: string
          name: string
          pdf_url?: string | null
          project_id?: string | null
          scale_meters_per_pixel?: number | null
          state_json?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          design_purpose?: string
          id?: string
          name?: string
          pdf_url?: string | null
          project_id?: string | null
          scale_meters_per_pixel?: number | null
          state_json?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_pv_arrays: {
        Row: {
          columns: number
          created_at: string
          id: string
          orientation: string
          roof_id: string
          rotation: number | null
          rows: number
          x: number
          y: number
        }
        Insert: {
          columns: number
          created_at?: string
          id?: string
          orientation: string
          roof_id: string
          rotation?: number | null
          rows: number
          x: number
          y: number
        }
        Update: {
          columns?: number
          created_at?: string
          id?: string
          orientation?: string
          roof_id?: string
          rotation?: number | null
          rows?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_pv_arrays_roof_id_fkey"
            columns: ["roof_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_pv_roofs"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_pv_config: {
        Row: {
          created_at: string
          floor_plan_id: string
          id: string
          panel_length_m: number
          panel_wattage: number
          panel_width_m: number
        }
        Insert: {
          created_at?: string
          floor_plan_id: string
          id?: string
          panel_length_m: number
          panel_wattage: number
          panel_width_m: number
        }
        Update: {
          created_at?: string
          floor_plan_id?: string
          id?: string
          panel_length_m?: number
          panel_wattage?: number
          panel_width_m?: number
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_pv_config_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_pv_roofs: {
        Row: {
          azimuth_degrees: number | null
          created_at: string
          floor_plan_id: string
          high_point: Json | null
          id: string
          low_point: Json | null
          mask_points: Json
          pitch_degrees: number | null
        }
        Insert: {
          azimuth_degrees?: number | null
          created_at?: string
          floor_plan_id: string
          high_point?: Json | null
          id?: string
          low_point?: Json | null
          mask_points: Json
          pitch_degrees?: number | null
        }
        Update: {
          azimuth_degrees?: number | null
          created_at?: string
          floor_plan_id?: string
          high_point?: Json | null
          id?: string
          low_point?: Json | null
          mask_points?: Json
          pitch_degrees?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_pv_roofs_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_reports: {
        Row: {
          comments: string | null
          created_at: string
          file_path: string
          id: string
          project_name: string
          report_revision: number
          user_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          file_path: string
          id?: string
          project_name: string
          report_revision?: number
          user_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          file_path?: string
          id?: string
          project_name?: string
          report_revision?: number
          user_id?: string
        }
        Relationships: []
      }
      floor_plan_tasks: {
        Row: {
          assignee: string | null
          created_at: string
          description: string | null
          floor_plan_id: string
          id: string
          item_id: string | null
          item_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          description?: string | null
          floor_plan_id: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          description?: string | null
          floor_plan_id?: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_tasks_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_zones: {
        Row: {
          area_sqm: number | null
          created_at: string
          floor_plan_id: string
          id: string
          label: string | null
          points: Json
        }
        Insert: {
          area_sqm?: number | null
          created_at?: string
          floor_plan_id: string
          id?: string
          label?: string | null
          points: Json
        }
        Update: {
          area_sqm?: number | null
          created_at?: string
          floor_plan_id?: string
          id?: string
          label?: string | null
          points?: Json
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_zones_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generator_reports: {
        Row: {
          created_at: string | null
          file_path: string
          file_size: number | null
          generated_at: string | null
          generated_by: string | null
          id: string
          notes: string | null
          project_id: string
          report_name: string
          revision: string | null
          tenant_schedule_version: number | null
        }
        Insert: {
          created_at?: string | null
          file_path: string
          file_size?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          project_id: string
          report_name: string
          revision?: string | null
          tenant_schedule_version?: number | null
        }
        Update: {
          created_at?: string | null
          file_path?: string
          file_size?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          report_name?: string
          revision?: string | null
          tenant_schedule_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generator_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generator_settings: {
        Row: {
          additional_cabling_cost: number | null
          capital_recovery_period_years: number | null
          capital_recovery_rate_percent: number | null
          control_wiring_cost: number | null
          created_at: string | null
          fast_food_kw_per_sqm: number | null
          id: string
          national_kw_per_sqm: number | null
          num_main_boards: number | null
          num_tenant_dbs: number | null
          project_id: string
          rate_per_main_board: number | null
          rate_per_tenant_db: number | null
          restaurant_kw_per_sqm: number | null
          standard_kw_per_sqm: number | null
          tenant_rate: number | null
          updated_at: string | null
        }
        Insert: {
          additional_cabling_cost?: number | null
          capital_recovery_period_years?: number | null
          capital_recovery_rate_percent?: number | null
          control_wiring_cost?: number | null
          created_at?: string | null
          fast_food_kw_per_sqm?: number | null
          id?: string
          national_kw_per_sqm?: number | null
          num_main_boards?: number | null
          num_tenant_dbs?: number | null
          project_id: string
          rate_per_main_board?: number | null
          rate_per_tenant_db?: number | null
          restaurant_kw_per_sqm?: number | null
          standard_kw_per_sqm?: number | null
          tenant_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          additional_cabling_cost?: number | null
          capital_recovery_period_years?: number | null
          capital_recovery_rate_percent?: number | null
          control_wiring_cost?: number | null
          created_at?: string | null
          fast_food_kw_per_sqm?: number | null
          id?: string
          national_kw_per_sqm?: number | null
          num_main_boards?: number | null
          num_tenant_dbs?: number | null
          project_id?: string
          rate_per_main_board?: number | null
          rate_per_tenant_db?: number | null
          restaurant_kw_per_sqm?: number | null
          standard_kw_per_sqm?: number | null
          tenant_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generator_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generator_sizing_data: {
        Row: {
          created_at: string
          display_order: number
          id: string
          load_100: number
          load_25: number
          load_50: number
          load_75: number
          project_id: string
          rating: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          load_100?: number
          load_25?: number
          load_50?: number
          load_75?: number
          project_id: string
          rating: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          load_100?: number
          load_25?: number
          load_50?: number
          load_75?: number
          project_id?: string
          rating?: string
          updated_at?: string
        }
        Relationships: []
      }
      generator_zones: {
        Row: {
          created_at: string
          display_order: number
          generator_cost: number | null
          generator_size: string | null
          id: string
          notes: string | null
          num_generators: number | null
          project_id: string
          updated_at: string
          zone_color: string | null
          zone_name: string
          zone_number: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          generator_cost?: number | null
          generator_size?: string | null
          id?: string
          notes?: string | null
          num_generators?: number | null
          project_id: string
          updated_at?: string
          zone_color?: string | null
          zone_name: string
          zone_number: number
        }
        Update: {
          created_at?: string
          display_order?: number
          generator_cost?: number | null
          generator_size?: string | null
          id?: string
          notes?: string | null
          num_generators?: number | null
          project_id?: string
          updated_at?: string
          zone_color?: string | null
          zone_name?: string
          zone_number?: number
        }
        Relationships: []
      }
      global_contacts: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          contact_person_name: string | null
          contact_type: string
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          notes: string | null
          organization_name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          contact_person_name?: string | null
          contact_type: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          organization_name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          contact_person_name?: string | null
          contact_type?: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          organization_name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      handover_document_exclusions: {
        Row: {
          created_at: string | null
          document_type: string
          exclusion_reason: string | null
          id: string
          marked_by: string | null
          notes: string | null
          project_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          document_type: string
          exclusion_reason?: string | null
          id?: string
          marked_by?: string | null
          notes?: string | null
          project_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          document_type?: string
          exclusion_reason?: string | null
          id?: string
          marked_by?: string | null
          notes?: string | null
          project_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_document_exclusions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_document_exclusions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_documents: {
        Row: {
          added_by: string | null
          created_at: string | null
          document_name: string
          document_type: string
          file_size: number | null
          file_url: string | null
          id: string
          notes: string | null
          project_id: string
          source_id: string | null
          source_type: string
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          document_name: string
          document_type: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          project_id: string
          source_id?: string | null
          source_type: string
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          document_name?: string
          document_type?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          source_id?: string | null
          source_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handover_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_links: {
        Row: {
          access_count: number | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          link_token: string
          project_id: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          link_token: string
          project_id: string
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          link_token?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      import_sessions: {
        Row: {
          created_at: string
          dependencies: Json
          files_content: Json
          id: string
          repo_name: string
          repo_url: string
          selected_files: Json
          status: string
        }
        Insert: {
          created_at?: string
          dependencies: Json
          files_content: Json
          id?: string
          repo_name: string
          repo_url: string
          selected_files: Json
          status?: string
        }
        Update: {
          created_at?: string
          dependencies?: Json
          files_content?: Json
          id?: string
          repo_name?: string
          repo_url?: string
          selected_files?: Json
          status?: string
        }
        Relationships: []
      }
      inspection_comments: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          inspection_id: string | null
          mentions: Json | null
          parent_comment_id: string | null
          subsection_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          inspection_id?: string | null
          mentions?: Json | null
          parent_comment_id?: string | null
          subsection_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          inspection_id?: string | null
          mentions?: Json | null
          parent_comment_id?: string | null
          subsection_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "inspection_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_history: {
        Row: {
          amount_excl_vat: number | null
          amount_incl_vat: number | null
          client_details: string | null
          created_at: string
          created_by: string | null
          extracted_by_ai: boolean | null
          id: string
          invoice_date: string | null
          invoice_month: string
          invoice_number: string
          job_name: string
          notes: string | null
          pdf_file_path: string | null
          project_id: string | null
          updated_at: string
          vat_amount: number | null
          vat_number: string | null
        }
        Insert: {
          amount_excl_vat?: number | null
          amount_incl_vat?: number | null
          client_details?: string | null
          created_at?: string
          created_by?: string | null
          extracted_by_ai?: boolean | null
          id?: string
          invoice_date?: string | null
          invoice_month: string
          invoice_number: string
          job_name: string
          notes?: string | null
          pdf_file_path?: string | null
          project_id?: string | null
          updated_at?: string
          vat_amount?: number | null
          vat_number?: string | null
        }
        Update: {
          amount_excl_vat?: number | null
          amount_incl_vat?: number | null
          client_details?: string | null
          created_at?: string
          created_by?: string | null
          extracted_by_ai?: boolean | null
          id?: string
          invoice_date?: string | null
          invoice_month?: string
          invoice_number?: string
          job_name?: string
          notes?: string | null
          pdf_file_path?: string | null
          project_id?: string | null
          updated_at?: string
          vat_amount?: number | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "invoice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_notification_logs: {
        Row: {
          error_message: string | null
          id: string
          notification_month: string
          projects_count: number | null
          recipient_email: string
          sent_at: string | null
          status: string | null
          total_scheduled_amount: number | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          notification_month: string
          projects_count?: number | null
          recipient_email: string
          sent_at?: string | null
          status?: string | null
          total_scheduled_amount?: number | null
        }
        Update: {
          error_message?: string | null
          id?: string
          notification_month?: string
          projects_count?: number | null
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
          total_scheduled_amount?: number | null
        }
        Relationships: []
      }
      invoice_notification_settings: {
        Row: {
          auto_generate_invoices: boolean | null
          created_at: string | null
          days_before_reminder: number | null
          id: string
          include_schedule_summary: boolean | null
          notification_day: number
          notification_email: string
          notifications_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          auto_generate_invoices?: boolean | null
          created_at?: string | null
          days_before_reminder?: number | null
          id?: string
          include_schedule_summary?: boolean | null
          notification_day?: number
          notification_email: string
          notifications_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          auto_generate_invoices?: boolean | null
          created_at?: string | null
          days_before_reminder?: number | null
          id?: string
          include_schedule_summary?: boolean | null
          notification_day?: number
          notification_email?: string
          notifications_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_projects: {
        Row: {
          agreed_fee: number
          client_address: string | null
          client_name: string
          client_vat_number: string | null
          created_at: string | null
          created_by: string
          id: string
          outstanding_amount: number
          project_name: string
          status: string | null
          total_invoiced: number | null
          updated_at: string | null
        }
        Insert: {
          agreed_fee: number
          client_address?: string | null
          client_name: string
          client_vat_number?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          outstanding_amount: number
          project_name: string
          status?: string | null
          total_invoiced?: number | null
          updated_at?: string | null
        }
        Update: {
          agreed_fee?: number
          client_address?: string | null
          client_name?: string
          client_vat_number?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          outstanding_amount?: number
          project_name?: string
          status?: string | null
          total_invoiced?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_settings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bank_account_name: string | null
          bank_account_no: string | null
          bank_branch: string | null
          bank_branch_code: string | null
          bank_name: string | null
          cell: string | null
          company_name: string
          company_reg_no: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          postal_address: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          cell?: string | null
          company_name?: string
          company_reg_no?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          postal_address?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          cell?: string | null
          company_name?: string
          company_reg_no?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          postal_address?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      invoice_uploads: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          file_name: string
          file_size: number
          file_url: string
          id: string
          invoice_id: string | null
          processing_status: string
          project_id: string | null
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          file_name: string
          file_size: number
          file_url: string
          id?: string
          invoice_id?: string | null
          processing_status?: string
          project_id?: string | null
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          invoice_id?: string | null
          processing_status?: string
          project_id?: string | null
          updated_at?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "invoice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_name: string
          created_at: string | null
          description: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          project_reference: string | null
          status: string
          total_amount: number
          updated_at: string | null
          vat_amount: number
        }
        Insert: {
          amount?: number
          client_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          project_reference?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          vat_amount?: number
        }
        Update: {
          amount?: number
          client_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          project_reference?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          vat_amount?: number
        }
        Relationships: []
      }
      issue_reports: {
        Row: {
          additional_context: string | null
          admin_notes: string | null
          admin_response: string | null
          attachments: Json | null
          browser_info: Json | null
          category: string
          console_logs: string | null
          created_at: string
          description: string
          id: string
          needs_user_attention: boolean | null
          page_url: string
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          responded_at: string | null
          responded_by: string | null
          screenshot_url: string | null
          severity: string
          status: string
          updated_at: string
          user_email: string
          user_name: string | null
          user_verification_response: string | null
          user_verified: boolean | null
          user_verified_at: string | null
          verification_requested_at: string | null
        }
        Insert: {
          additional_context?: string | null
          admin_notes?: string | null
          admin_response?: string | null
          attachments?: Json | null
          browser_info?: Json | null
          category?: string
          console_logs?: string | null
          created_at?: string
          description: string
          id?: string
          needs_user_attention?: boolean | null
          page_url: string
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          screenshot_url?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_email: string
          user_name?: string | null
          user_verification_response?: string | null
          user_verified?: boolean | null
          user_verified_at?: string | null
          verification_requested_at?: string | null
        }
        Update: {
          additional_context?: string | null
          admin_notes?: string | null
          admin_response?: string | null
          attachments?: Json | null
          browser_info?: Json | null
          category?: string
          console_logs?: string | null
          created_at?: string
          description?: string
          id?: string
          needs_user_attention?: boolean | null
          page_url?: string
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          screenshot_url?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_email?: string
          user_name?: string | null
          user_verification_response?: string | null
          user_verified?: boolean | null
          user_verified_at?: string | null
          verification_requested_at?: string | null
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          remaining_days: number
          total_days: number
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          remaining_days?: number
          total_days?: number
          updated_at?: string
          used_days?: number
          year: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          remaining_days?: number
          total_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          days_requested: number
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_requested: number
          employee_id: string
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_requested?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          code: string
          created_at: string
          days_per_year: number | null
          description: string | null
          id: string
          is_paid: boolean | null
          name: string
          requires_approval: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          days_per_year?: number | null
          description?: string | null
          id?: string
          is_paid?: boolean | null
          name: string
          requires_approval?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          days_per_year?: number | null
          description?: string | null
          id?: string
          is_paid?: boolean | null
          name?: string
          requires_approval?: boolean | null
        }
        Relationships: []
      }
      lighting_analysis_settings: {
        Row: {
          analysis_period_years: number | null
          created_at: string
          electricity_rate: number | null
          id: string
          include_vat: boolean | null
          operating_hours_per_day: number | null
          project_id: string | null
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          analysis_period_years?: number | null
          created_at?: string
          electricity_rate?: number | null
          id?: string
          include_vat?: boolean | null
          operating_hours_per_day?: number | null
          project_id?: string | null
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          analysis_period_years?: number | null
          created_at?: string
          electricity_rate?: number | null
          id?: string
          include_vat?: boolean | null
          operating_hours_per_day?: number | null
          project_id?: string | null
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lighting_analysis_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lighting_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comments: string | null
          created_at: string
          id: string
          project_id: string
          schedule_id: string | null
          section_type: string | null
          signature_data: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          project_id: string
          schedule_id?: string | null
          section_type?: string | null
          signature_data?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          project_id?: string
          schedule_id?: string | null
          section_type?: string | null
          signature_data?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lighting_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lighting_approvals_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "project_lighting_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lighting_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lighting_comparisons: {
        Row: {
          comparison_criteria: Json | null
          comparison_name: string
          created_at: string
          created_by: string | null
          fitting_ids: string[]
          id: string
          notes: string | null
          project_id: string | null
        }
        Insert: {
          comparison_criteria?: Json | null
          comparison_name: string
          created_at?: string
          created_by?: string | null
          fitting_ids: string[]
          id?: string
          notes?: string | null
          project_id?: string | null
        }
        Update: {
          comparison_criteria?: Json | null
          comparison_name?: string
          created_at?: string
          created_by?: string | null
          fitting_ids?: string[]
          id?: string
          notes?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lighting_comparisons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lighting_fittings: {
        Row: {
          beam_angle: number | null
          category: string | null
          color_temperature: number | null
          created_at: string
          created_by: string | null
          cri: number | null
          dimensions: string | null
          dimmable: boolean | null
          driver_type: string | null
          fitting_code: string
          fitting_type: string
          id: string
          ik_rating: string | null
          image_url: string | null
          install_cost: number | null
          ip_rating: string | null
          is_dimmable: boolean | null
          lifespan_hours: number | null
          lumen_output: number | null
          manufacturer: string | null
          model_name: string
          notes: string | null
          project_id: string | null
          spec_sheet_url: string | null
          subcategory: string | null
          supply_cost: number | null
          updated_at: string
          warranty_terms: string | null
          warranty_years: number | null
          wattage: number | null
          wattage_variants: Json | null
          weight: number | null
        }
        Insert: {
          beam_angle?: number | null
          category?: string | null
          color_temperature?: number | null
          created_at?: string
          created_by?: string | null
          cri?: number | null
          dimensions?: string | null
          dimmable?: boolean | null
          driver_type?: string | null
          fitting_code: string
          fitting_type: string
          id?: string
          ik_rating?: string | null
          image_url?: string | null
          install_cost?: number | null
          ip_rating?: string | null
          is_dimmable?: boolean | null
          lifespan_hours?: number | null
          lumen_output?: number | null
          manufacturer?: string | null
          model_name: string
          notes?: string | null
          project_id?: string | null
          spec_sheet_url?: string | null
          subcategory?: string | null
          supply_cost?: number | null
          updated_at?: string
          warranty_terms?: string | null
          warranty_years?: number | null
          wattage?: number | null
          wattage_variants?: Json | null
          weight?: number | null
        }
        Update: {
          beam_angle?: number | null
          category?: string | null
          color_temperature?: number | null
          created_at?: string
          created_by?: string | null
          cri?: number | null
          dimensions?: string | null
          dimmable?: boolean | null
          driver_type?: string | null
          fitting_code?: string
          fitting_type?: string
          id?: string
          ik_rating?: string | null
          image_url?: string | null
          install_cost?: number | null
          ip_rating?: string | null
          is_dimmable?: boolean | null
          lifespan_hours?: number | null
          lumen_output?: number | null
          manufacturer?: string | null
          model_name?: string
          notes?: string | null
          project_id?: string | null
          spec_sheet_url?: string | null
          subcategory?: string | null
          supply_cost?: number | null
          updated_at?: string
          warranty_terms?: string | null
          warranty_years?: number | null
          wattage?: number | null
          wattage_variants?: Json | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lighting_fittings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lighting_photometric_data: {
        Row: {
          candela_data: Json | null
          fitting_id: string
          id: string
          ies_file_path: string | null
          lamp_type: string | null
          lumens: number | null
          mounting_type: string | null
          parsed_at: string
          utilization_data: Json | null
        }
        Insert: {
          candela_data?: Json | null
          fitting_id: string
          id?: string
          ies_file_path?: string | null
          lamp_type?: string | null
          lumens?: number | null
          mounting_type?: string | null
          parsed_at?: string
          utilization_data?: Json | null
        }
        Update: {
          candela_data?: Json | null
          fitting_id?: string
          id?: string
          ies_file_path?: string | null
          lamp_type?: string | null
          lumens?: number | null
          mounting_type?: string | null
          parsed_at?: string
          utilization_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lighting_photometric_data_fitting_id_fkey"
            columns: ["fitting_id"]
            isOneToOne: false
            referencedRelation: "lighting_fittings"
            referencedColumns: ["id"]
          },
        ]
      }
      lighting_quote_requests: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          items: Json
          notes: string | null
          project_id: string | null
          quoted_total: number | null
          reference_number: string | null
          response_received_at: string | null
          sent_at: string | null
          status: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          project_id?: string | null
          quoted_total?: number | null
          reference_number?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          project_id?: string | null
          quoted_total?: number | null
          reference_number?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lighting_quote_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lighting_quote_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "lighting_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      lighting_report_templates: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lighting_report_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lighting_spec_sheets: {
        Row: {
          confidence_scores: Json | null
          created_at: string
          extracted_data: Json | null
          extraction_error: string | null
          extraction_status: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          fitting_id: string | null
          id: string
          parsed_data: Json | null
          project_id: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          confidence_scores?: Json | null
          created_at?: string
          extracted_data?: Json | null
          extraction_error?: string | null
          extraction_status?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          fitting_id?: string | null
          id?: string
          parsed_data?: Json | null
          project_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          confidence_scores?: Json | null
          created_at?: string
          extracted_data?: Json | null
          extraction_error?: string | null
          extraction_status?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          fitting_id?: string | null
          id?: string
          parsed_data?: Json | null
          project_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lighting_spec_sheets_fitting_id_fkey"
            columns: ["fitting_id"]
            isOneToOne: false
            referencedRelation: "lighting_fittings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lighting_spec_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lighting_suppliers: {
        Row: {
          address: string | null
          categories: string[] | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_preferred: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          categories?: string[] | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_preferred?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          categories?: string[] | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_preferred?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      lighting_zones: {
        Row: {
          area_m2: number | null
          color_temperature_max: number | null
          color_temperature_min: number | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          max_wattage_per_m2: number | null
          min_lux: number | null
          project_id: string
          updated_at: string
          zone_name: string
          zone_type: string
        }
        Insert: {
          area_m2?: number | null
          color_temperature_max?: number | null
          color_temperature_min?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          max_wattage_per_m2?: number | null
          min_lux?: number | null
          project_id: string
          updated_at?: string
          zone_name: string
          zone_type?: string
        }
        Update: {
          area_m2?: number | null
          color_temperature_max?: number | null
          color_temperature_min?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          max_wattage_per_m2?: number | null
          min_lux?: number | null
          project_id?: string
          updated_at?: string
          zone_name?: string
          zone_type?: string
        }
        Relationships: []
      }
      master_materials: {
        Row: {
          approved_by: string | null
          category_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          eastern_cape_modifier: number | null
          effective_from: string | null
          effective_until: string | null
          free_state_modifier: number | null
          gauteng_modifier: number | null
          id: string
          is_active: boolean | null
          kwazulu_natal_modifier: number | null
          limpopo_modifier: number | null
          manufacturer: string | null
          material_code: string
          material_name: string
          model_number: string | null
          mpumalanga_modifier: number | null
          north_west_modifier: number | null
          northern_cape_modifier: number | null
          notes: string | null
          preferred_suppliers: string[] | null
          specifications: Json | null
          standard_install_cost: number | null
          standard_supply_cost: number | null
          unit: string | null
          updated_at: string | null
          usage_count: number | null
          western_cape_modifier: number | null
        }
        Insert: {
          approved_by?: string | null
          category_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          eastern_cape_modifier?: number | null
          effective_from?: string | null
          effective_until?: string | null
          free_state_modifier?: number | null
          gauteng_modifier?: number | null
          id?: string
          is_active?: boolean | null
          kwazulu_natal_modifier?: number | null
          limpopo_modifier?: number | null
          manufacturer?: string | null
          material_code: string
          material_name: string
          model_number?: string | null
          mpumalanga_modifier?: number | null
          north_west_modifier?: number | null
          northern_cape_modifier?: number | null
          notes?: string | null
          preferred_suppliers?: string[] | null
          specifications?: Json | null
          standard_install_cost?: number | null
          standard_supply_cost?: number | null
          unit?: string | null
          updated_at?: string | null
          usage_count?: number | null
          western_cape_modifier?: number | null
        }
        Update: {
          approved_by?: string | null
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          eastern_cape_modifier?: number | null
          effective_from?: string | null
          effective_until?: string | null
          free_state_modifier?: number | null
          gauteng_modifier?: number | null
          id?: string
          is_active?: boolean | null
          kwazulu_natal_modifier?: number | null
          limpopo_modifier?: number | null
          manufacturer?: string | null
          material_code?: string
          material_name?: string
          model_number?: string | null
          mpumalanga_modifier?: number | null
          north_west_modifier?: number | null
          northern_cape_modifier?: number | null
          notes?: string | null
          preferred_suppliers?: string[] | null
          specifications?: Json | null
          standard_install_cost?: number | null
          standard_supply_cost?: number | null
          unit?: string | null
          updated_at?: string | null
          usage_count?: number | null
          western_cape_modifier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      master_rate_library: {
        Row: {
          approved_by: string | null
          base_rate: number | null
          created_at: string | null
          created_by: string | null
          eastern_cape_modifier: number | null
          effective_from: string | null
          effective_until: string | null
          free_state_modifier: number | null
          gauteng_modifier: number | null
          id: string
          is_current: boolean | null
          item_code: string | null
          item_description: string
          item_type: string
          kwazulu_natal_modifier: number | null
          limpopo_modifier: number | null
          mpumalanga_modifier: number | null
          north_west_modifier: number | null
          northern_cape_modifier: number | null
          notes: string | null
          retailer_id: string | null
          ti_rate: number | null
          unit: string | null
          updated_at: string | null
          usage_count: number | null
          western_cape_modifier: number | null
        }
        Insert: {
          approved_by?: string | null
          base_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          eastern_cape_modifier?: number | null
          effective_from?: string | null
          effective_until?: string | null
          free_state_modifier?: number | null
          gauteng_modifier?: number | null
          id?: string
          is_current?: boolean | null
          item_code?: string | null
          item_description: string
          item_type: string
          kwazulu_natal_modifier?: number | null
          limpopo_modifier?: number | null
          mpumalanga_modifier?: number | null
          north_west_modifier?: number | null
          northern_cape_modifier?: number | null
          notes?: string | null
          retailer_id?: string | null
          ti_rate?: number | null
          unit?: string | null
          updated_at?: string | null
          usage_count?: number | null
          western_cape_modifier?: number | null
        }
        Update: {
          approved_by?: string | null
          base_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          eastern_cape_modifier?: number | null
          effective_from?: string | null
          effective_until?: string | null
          free_state_modifier?: number | null
          gauteng_modifier?: number | null
          id?: string
          is_current?: boolean | null
          item_code?: string | null
          item_description?: string
          item_type?: string
          kwazulu_natal_modifier?: number | null
          limpopo_modifier?: number | null
          mpumalanga_modifier?: number | null
          north_west_modifier?: number | null
          northern_cape_modifier?: number | null
          notes?: string | null
          retailer_id?: string | null
          ti_rate?: number | null
          unit?: string | null
          updated_at?: string | null
          usage_count?: number | null
          western_cape_modifier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_rate_library_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailer_master"
            referencedColumns: ["id"]
          },
        ]
      }
      material_analytics_snapshots: {
        Row: {
          avg_cost_per_sqm: number | null
          avg_quantity_per_sqm: number | null
          avg_unit_cost: number | null
          building_type: string | null
          category_id: string | null
          created_at: string | null
          id: string
          material_id: string | null
          max_unit_cost: number | null
          min_unit_cost: number | null
          province: string | null
          region_type: string | null
          snapshot_date: string
          stddev_unit_cost: number | null
          total_cost: number | null
          total_projects: number | null
          total_quantity: number | null
        }
        Insert: {
          avg_cost_per_sqm?: number | null
          avg_quantity_per_sqm?: number | null
          avg_unit_cost?: number | null
          building_type?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          max_unit_cost?: number | null
          min_unit_cost?: number | null
          province?: string | null
          region_type?: string | null
          snapshot_date?: string
          stddev_unit_cost?: number | null
          total_cost?: number | null
          total_projects?: number | null
          total_quantity?: number | null
        }
        Update: {
          avg_cost_per_sqm?: number | null
          avg_quantity_per_sqm?: number | null
          avg_unit_cost?: number | null
          building_type?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          max_unit_cost?: number | null
          min_unit_cost?: number | null
          province?: string | null
          region_type?: string | null
          snapshot_date?: string
          stddev_unit_cost?: number | null
          total_cost?: number | null
          total_projects?: number | null
          total_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_analytics_snapshots_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_analytics_snapshots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "master_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          parent_category_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category_code?: string
          category_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      material_price_audit: {
        Row: {
          change_percent: number | null
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          material_id: string
          new_install_cost: number | null
          new_supply_cost: number | null
          old_install_cost: number | null
          old_supply_cost: number | null
        }
        Insert: {
          change_percent?: number | null
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          material_id: string
          new_install_cost?: number | null
          new_supply_cost?: number | null
          old_install_cost?: number | null
          old_supply_cost?: number | null
        }
        Update: {
          change_percent?: number | null
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          material_id?: string
          new_install_cost?: number | null
          new_supply_cost?: number | null
          old_install_cost?: number | null
          old_supply_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_price_audit_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "master_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      message_notifications: {
        Row: {
          created_at: string
          email_sent: boolean | null
          id: string
          is_read: boolean | null
          message_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          message_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          message_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          mentions: Json | null
          read_by: Json | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          mentions?: Json | null
          read_by?: Json | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          mentions?: Json | null
          read_by?: Json | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_expenses: {
        Row: {
          actual_amount: number | null
          budgeted_amount: number
          category_id: string
          created_at: string
          created_by: string | null
          expense_month: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          budgeted_amount?: number
          category_id: string
          created_at?: string
          created_by?: string | null
          expense_month: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          budgeted_amount?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          expense_month?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string | null
          payment_month: string
          project_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          payment_month: string
          project_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          payment_month?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "invoice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completion_date: string | null
          created_at: string
          employee_id: string
          id: string
          start_date: string | null
          status: Database["public"]["Enums"]["onboarding_status"]
          tasks_completed: Json | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          employee_id: string
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          tasks_completed?: Json | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          tasks_completed?: Json | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tasks: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tasks?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tasks?: Json
          updated_at?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          email: string
          id: string
          requested_at: string | null
          requested_by: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pay_slips: {
        Row: {
          created_at: string
          deductions: Json | null
          employee_id: string
          file_url: string | null
          gross_pay: number
          id: string
          net_pay: number
          pay_period_end: string
          pay_period_start: string
          payment_date: string
          payroll_record_id: string | null
        }
        Insert: {
          created_at?: string
          deductions?: Json | null
          employee_id: string
          file_url?: string | null
          gross_pay: number
          id?: string
          net_pay: number
          pay_period_end: string
          pay_period_start: string
          payment_date: string
          payroll_record_id?: string | null
        }
        Update: {
          created_at?: string
          deductions?: Json | null
          employee_id?: string
          file_url?: string | null
          gross_pay?: number
          id?: string
          net_pay?: number
          pay_period_end?: string
          pay_period_start?: string
          payment_date?: string
          payroll_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pay_slips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_slips_payroll_record_id_fkey"
            columns: ["payroll_record_id"]
            isOneToOne: false
            referencedRelation: "payroll_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          created_at: string
          effective_date: string
          employee_id: string
          end_date: string | null
          id: string
          payment_frequency: string
          salary_amount: number
          salary_currency: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_date: string
          employee_id: string
          end_date?: string | null
          id?: string
          payment_frequency: string
          salary_amount: number
          salary_currency?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          payment_frequency?: string
          salary_amount?: number
          salary_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_style_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          report_type: string
          settings: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          report_type: string
          settings: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          report_type?: string
          settings?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      pdf_templates: {
        Row: {
          captured_components: Json | null
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          project_id: string | null
          template_json: Json
          thumbnail: string | null
          updated_at: string
        }
        Insert: {
          captured_components?: Json | null
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          project_id?: string | null
          template_json: Json
          thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          captured_components?: Json | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          project_id?: string | null
          template_json?: Json
          thumbnail?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_goals: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string
          id: string
          progress: number | null
          status: string | null
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id: string
          id?: string
          progress?: number | null
          status?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          progress?: number | null
          status?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          areas_for_improvement: string | null
          comments: string | null
          created_at: string
          employee_id: string
          goals: string | null
          id: string
          overall_rating: number | null
          review_date: string | null
          review_period_end: string
          review_period_start: string
          reviewer_id: string
          status: Database["public"]["Enums"]["review_status"]
          strengths: string | null
          updated_at: string
        }
        Insert: {
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string
          employee_id: string
          goals?: string | null
          id?: string
          overall_rating?: number | null
          review_date?: string | null
          review_period_end: string
          review_period_start: string
          reviewer_id: string
          status?: Database["public"]["Enums"]["review_status"]
          strengths?: string | null
          updated_at?: string
        }
        Update: {
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string
          employee_id?: string
          goals?: string | null
          id?: string
          overall_rating?: number | null
          review_date?: string | null
          review_period_end?: string
          review_period_start?: string
          reviewer_id?: string
          status?: Database["public"]["Enums"]["review_status"]
          strengths?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          level: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          level?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          level?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_login: boolean | null
          full_name: string
          id: string
          last_login_at: string | null
          login_count: number | null
          must_change_password: boolean | null
          password_changed_at: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_login?: boolean | null
          full_name: string
          id: string
          last_login_at?: string | null
          login_count?: number | null
          must_change_password?: boolean | null
          password_changed_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_login?: boolean | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          login_count?: number | null
          must_change_password?: boolean | null
          password_changed_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_contacts: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          contact_person_name: string | null
          contact_type: string
          created_at: string | null
          created_by: string | null
          email: string | null
          global_contact_id: string | null
          id: string
          is_primary: boolean | null
          logo_url: string | null
          notes: string | null
          organization_name: string
          phone: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          contact_person_name?: string | null
          contact_type: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          global_contact_id?: string | null
          id?: string
          is_primary?: boolean | null
          logo_url?: string | null
          notes?: string | null
          organization_name: string
          phone?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          contact_person_name?: string | null
          contact_type?: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          global_contact_id?: string | null
          id?: string
          is_primary?: boolean | null
          logo_url?: string | null
          notes?: string | null
          organization_name?: string
          phone?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_global_contact_id_fkey"
            columns: ["global_contact_id"]
            isOneToOne: false
            referencedRelation: "global_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cost_benchmarks: {
        Row: {
          benchmark_status: string | null
          cable_cost: number | null
          calculated_at: string | null
          calculated_by: string | null
          comparison_count: number | null
          comparison_project_ids: string[] | null
          containment_cost: number | null
          cost_per_sqm: number | null
          cost_vs_avg_percent: number | null
          earthing_cost: number | null
          hv_equipment_cost: number | null
          id: string
          lighting_cost: number | null
          lv_equipment_cost: number | null
          metering_cost: number | null
          other_cost: number | null
          project_id: string
          total_gla: number | null
          total_material_cost: number | null
        }
        Insert: {
          benchmark_status?: string | null
          cable_cost?: number | null
          calculated_at?: string | null
          calculated_by?: string | null
          comparison_count?: number | null
          comparison_project_ids?: string[] | null
          containment_cost?: number | null
          cost_per_sqm?: number | null
          cost_vs_avg_percent?: number | null
          earthing_cost?: number | null
          hv_equipment_cost?: number | null
          id?: string
          lighting_cost?: number | null
          lv_equipment_cost?: number | null
          metering_cost?: number | null
          other_cost?: number | null
          project_id: string
          total_gla?: number | null
          total_material_cost?: number | null
        }
        Update: {
          benchmark_status?: string | null
          cable_cost?: number | null
          calculated_at?: string | null
          calculated_by?: string | null
          comparison_count?: number | null
          comparison_project_ids?: string[] | null
          containment_cost?: number | null
          cost_per_sqm?: number | null
          cost_vs_avg_percent?: number | null
          earthing_cost?: number | null
          hv_equipment_cost?: number | null
          id?: string
          lighting_cost?: number | null
          lv_equipment_cost?: number | null
          metering_cost?: number | null
          other_cost?: number | null
          project_id?: string
          total_gla?: number | null
          total_material_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_benchmarks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_floor_plans: {
        Row: {
          base_pdf_url: string | null
          composite_image_url: string | null
          created_at: string | null
          id: string
          project_id: string
          scale_info: Json | null
          scale_line_end: Json | null
          scale_line_start: Json | null
          scale_pixels_per_meter: number | null
          updated_at: string | null
        }
        Insert: {
          base_pdf_url?: string | null
          composite_image_url?: string | null
          created_at?: string | null
          id?: string
          project_id: string
          scale_info?: Json | null
          scale_line_end?: Json | null
          scale_line_start?: Json | null
          scale_pixels_per_meter?: number | null
          updated_at?: string | null
        }
        Update: {
          base_pdf_url?: string | null
          composite_image_url?: string | null
          created_at?: string | null
          id?: string
          project_id?: string
          scale_info?: Json | null
          scale_line_end?: Json | null
          scale_line_start?: Json | null
          scale_pixels_per_meter?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_lighting_schedules: {
        Row: {
          approval_status: string | null
          created_at: string
          created_by: string | null
          fitting_id: string | null
          id: string
          notes: string | null
          project_id: string
          quantity: number | null
          tenant_id: string | null
          total_lumens: number | null
          total_wattage: number | null
          updated_at: string
          zone_id: string | null
          zone_name: string | null
        }
        Insert: {
          approval_status?: string | null
          created_at?: string
          created_by?: string | null
          fitting_id?: string | null
          id?: string
          notes?: string | null
          project_id: string
          quantity?: number | null
          tenant_id?: string | null
          total_lumens?: number | null
          total_wattage?: number | null
          updated_at?: string
          zone_id?: string | null
          zone_name?: string | null
        }
        Update: {
          approval_status?: string | null
          created_at?: string
          created_by?: string | null
          fitting_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          quantity?: number | null
          tenant_id?: string | null
          total_lumens?: number | null
          total_wattage?: number | null
          updated_at?: string
          zone_id?: string | null
          zone_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_lighting_schedules_fitting_id_fkey"
            columns: ["fitting_id"]
            isOneToOne: false
            referencedRelation: "lighting_fittings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_lighting_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_lighting_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_lighting_schedules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "lighting_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          area_served_sqm: number | null
          boq_section: string | null
          boq_upload_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          install_cost: number | null
          location_in_project: string | null
          master_material_id: string | null
          material_code: string | null
          material_name: string
          override_reason: string | null
          project_id: string
          quantity: number
          rate_overridden: boolean | null
          rate_source: string | null
          supply_cost: number | null
          tender_reference: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          area_served_sqm?: number | null
          boq_section?: string | null
          boq_upload_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          install_cost?: number | null
          location_in_project?: string | null
          master_material_id?: string | null
          material_code?: string | null
          material_name: string
          override_reason?: string | null
          project_id: string
          quantity?: number
          rate_overridden?: boolean | null
          rate_source?: string | null
          supply_cost?: number | null
          tender_reference?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          area_served_sqm?: number | null
          boq_section?: string | null
          boq_upload_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          install_cost?: number | null
          location_in_project?: string | null
          master_material_id?: string | null
          material_code?: string | null
          material_name?: string
          override_reason?: string | null
          project_id?: string
          quantity?: number
          rate_overridden?: boolean | null
          rate_source?: string | null
          supply_cost?: number | null
          tender_reference?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_boq_upload_id_fkey"
            columns: ["boq_upload_id"]
            isOneToOne: false
            referencedRelation: "boq_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_master_material_id_fkey"
            columns: ["master_material_id"]
            isOneToOne: false
            referencedRelation: "master_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_outline_sections: {
        Row: {
          content: string | null
          created_at: string
          id: string
          outline_id: string
          section_number: number
          section_title: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          outline_id: string
          section_number: number
          section_title: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          outline_id?: string
          section_number?: number
          section_title?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_outline_sections_outline_id_fkey"
            columns: ["outline_id"]
            isOneToOne: false
            referencedRelation: "project_outlines"
            referencedColumns: ["id"]
          },
        ]
      }
      project_outline_template_sections: {
        Row: {
          created_at: string
          default_content: string | null
          id: string
          section_number: number
          section_title: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          default_content?: string | null
          id?: string
          section_number: number
          section_title: string
          sort_order: number
          template_id: string
        }
        Update: {
          created_at?: string
          default_content?: string | null
          id?: string
          section_number?: number
          section_title?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_outline_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_outline_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_outline_templates: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          address_line3: string | null
          created_at: string
          created_by: string | null
          description: string | null
          document_title: string
          id: string
          is_default: boolean | null
          prepared_by: string | null
          telephone: string | null
          template_name: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_title?: string
          id?: string
          is_default?: boolean | null
          prepared_by?: string | null
          telephone?: string | null
          template_name: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_title?: string
          id?: string
          is_default?: boolean | null
          prepared_by?: string | null
          telephone?: string | null
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_outlines: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          address_line3: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          date: string | null
          document_title: string
          id: string
          prepared_by: string | null
          project_id: string
          project_name: string
          revision: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          document_title?: string
          id?: string
          prepared_by?: string | null
          project_id: string
          project_name: string
          revision?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          document_title?: string
          id?: string
          prepared_by?: string | null
          project_id?: string
          project_name?: string
          revision?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_outlines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_specifications: {
        Row: {
          client_logo_url: string | null
          consultant_logo_url: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          prepared_for_company: string | null
          prepared_for_contact: string | null
          prepared_for_email: string | null
          prepared_for_tel: string | null
          project_id: string
          revision: string
          spec_date: string
          spec_number: string
          spec_type: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_logo_url?: string | null
          consultant_logo_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          prepared_for_company?: string | null
          prepared_for_contact?: string | null
          prepared_for_email?: string | null
          prepared_for_tel?: string | null
          project_id: string
          revision?: string
          spec_date: string
          spec_number: string
          spec_type: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_logo_url?: string | null
          consultant_logo_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          prepared_for_company?: string | null
          prepared_for_contact?: string | null
          prepared_for_email?: string | null
          prepared_for_tel?: string | null
          project_id?: string
          revision?: string
          spec_date?: string
          spec_number?: string
          spec_type?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          building_calculation_type: string | null
          building_type: string | null
          cctv_contractor: string | null
          city: string | null
          client_logo_url: string | null
          client_name: string | null
          connection_size: string | null
          consultant_logo_url: string | null
          created_at: string
          created_by: string
          description: string | null
          diversity_factor: number | null
          earthing_contractor: string | null
          electrical_contractor: string | null
          electrical_standard: string | null
          id: string
          load_category: string | null
          metering_requirements: string | null
          name: string
          practical_completion_date: string | null
          primary_voltage: string | null
          project_logo_url: string | null
          project_number: string
          protection_philosophy: string | null
          province: string | null
          region_type: string | null
          site_handover_date: string | null
          standby_plants_contractor: string | null
          status: string | null
          supply_authority: string | null
          tariff_structure: string | null
          total_gla: number | null
          updated_at: string
        }
        Insert: {
          building_calculation_type?: string | null
          building_type?: string | null
          cctv_contractor?: string | null
          city?: string | null
          client_logo_url?: string | null
          client_name?: string | null
          connection_size?: string | null
          consultant_logo_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          diversity_factor?: number | null
          earthing_contractor?: string | null
          electrical_contractor?: string | null
          electrical_standard?: string | null
          id?: string
          load_category?: string | null
          metering_requirements?: string | null
          name: string
          practical_completion_date?: string | null
          primary_voltage?: string | null
          project_logo_url?: string | null
          project_number: string
          protection_philosophy?: string | null
          province?: string | null
          region_type?: string | null
          site_handover_date?: string | null
          standby_plants_contractor?: string | null
          status?: string | null
          supply_authority?: string | null
          tariff_structure?: string | null
          total_gla?: number | null
          updated_at?: string
        }
        Update: {
          building_calculation_type?: string | null
          building_type?: string | null
          cctv_contractor?: string | null
          city?: string | null
          client_logo_url?: string | null
          client_name?: string | null
          connection_size?: string | null
          consultant_logo_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          diversity_factor?: number | null
          earthing_contractor?: string | null
          electrical_contractor?: string | null
          electrical_standard?: string | null
          id?: string
          load_category?: string | null
          metering_requirements?: string | null
          name?: string
          practical_completion_date?: string | null
          primary_voltage?: string | null
          project_logo_url?: string | null
          project_number?: string
          protection_philosophy?: string | null
          province?: string | null
          region_type?: string | null
          site_handover_date?: string | null
          standby_plants_contractor?: string | null
          status?: string | null
          supply_authority?: string | null
          tariff_structure?: string | null
          total_gla?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_arrays: {
        Row: {
          columns: number
          created_at: string | null
          floor_plan_id: string
          id: string
          orientation: string
          rotation: number | null
          rows: number
          x_position: number
          y_position: number
        }
        Insert: {
          columns: number
          created_at?: string | null
          floor_plan_id: string
          id?: string
          orientation: string
          rotation?: number | null
          rows: number
          x_position: number
          y_position: number
        }
        Update: {
          columns?: number
          created_at?: string | null
          floor_plan_id?: string
          id?: string
          orientation?: string
          rotation?: number | null
          rows?: number
          x_position?: number
          y_position?: number
        }
        Relationships: []
      }
      rate_change_audit: {
        Row: {
          change_percent: number | null
          change_reason: string
          changed_at: string | null
          changed_by: string
          id: string
          new_base_rate: number | null
          new_ti_rate: number | null
          old_base_rate: number | null
          old_ti_rate: number | null
          rate_id: string
        }
        Insert: {
          change_percent?: number | null
          change_reason: string
          changed_at?: string | null
          changed_by: string
          id?: string
          new_base_rate?: number | null
          new_ti_rate?: number | null
          old_base_rate?: number | null
          old_ti_rate?: number | null
          rate_id: string
        }
        Update: {
          change_percent?: number | null
          change_reason?: string
          changed_at?: string | null
          changed_by?: string
          id?: string
          new_base_rate?: number | null
          new_ti_rate?: number | null
          old_base_rate?: number | null
          old_ti_rate?: number | null
          rate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_change_audit_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "master_rate_library"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_operations: {
        Row: {
          backup_id: string | null
          completed_at: string | null
          error_message: string | null
          id: string
          initiated_at: string | null
          initiated_by: string | null
          records_restored: Json | null
          recovery_type: string | null
          rollback_available: boolean | null
          status: string | null
          tables_to_restore: string[] | null
          target_timestamp: string | null
        }
        Insert: {
          backup_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          records_restored?: Json | null
          recovery_type?: string | null
          rollback_available?: boolean | null
          status?: string | null
          tables_to_restore?: string[] | null
          target_timestamp?: string | null
        }
        Update: {
          backup_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          records_restored?: Json | null
          recovery_type?: string | null
          rollback_available?: boolean | null
          status?: string | null
          tables_to_restore?: string[] | null
          target_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_operations_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backup_history"
            referencedColumns: ["id"]
          },
        ]
      }
      report_drafts: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          report_type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          report_type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      report_settings: {
        Row: {
          author_name: string | null
          background_pattern: string | null
          company_contact: Json | null
          company_logo_url: string | null
          company_name: string | null
          company_tagline: string | null
          cover_layout: Json | null
          created_at: string
          font_family: string | null
          font_size: number | null
          footer_style: Json | null
          header_style: Json | null
          id: string
          include_cover_page: boolean | null
          is_template: boolean | null
          line_spacing: number | null
          margins: Json | null
          page_orientation: string | null
          paragraph_spacing: number | null
          primary_color: string | null
          project_id: string | null
          secondary_color: string | null
          sections_order: Json | null
          show_date: boolean | null
          show_page_numbers: boolean | null
          table_style: Json | null
          template_name: string | null
          updated_at: string
          user_id: string
          watermark_opacity: number | null
          watermark_text: string | null
        }
        Insert: {
          author_name?: string | null
          background_pattern?: string | null
          company_contact?: Json | null
          company_logo_url?: string | null
          company_name?: string | null
          company_tagline?: string | null
          cover_layout?: Json | null
          created_at?: string
          font_family?: string | null
          font_size?: number | null
          footer_style?: Json | null
          header_style?: Json | null
          id?: string
          include_cover_page?: boolean | null
          is_template?: boolean | null
          line_spacing?: number | null
          margins?: Json | null
          page_orientation?: string | null
          paragraph_spacing?: number | null
          primary_color?: string | null
          project_id?: string | null
          secondary_color?: string | null
          sections_order?: Json | null
          show_date?: boolean | null
          show_page_numbers?: boolean | null
          table_style?: Json | null
          template_name?: string | null
          updated_at?: string
          user_id: string
          watermark_opacity?: number | null
          watermark_text?: string | null
        }
        Update: {
          author_name?: string | null
          background_pattern?: string | null
          company_contact?: Json | null
          company_logo_url?: string | null
          company_name?: string | null
          company_tagline?: string | null
          cover_layout?: Json | null
          created_at?: string
          font_family?: string | null
          font_size?: number | null
          footer_style?: Json | null
          header_style?: Json | null
          id?: string
          include_cover_page?: boolean | null
          is_template?: boolean | null
          line_spacing?: number | null
          margins?: Json | null
          page_orientation?: string | null
          paragraph_spacing?: number | null
          primary_color?: string | null
          project_id?: string | null
          secondary_color?: string | null
          sections_order?: Json | null
          show_date?: boolean | null
          show_page_numbers?: boolean | null
          table_style?: Json | null
          template_name?: string | null
          updated_at?: string
          user_id?: string
          watermark_opacity?: number | null
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          is_public: boolean | null
          report_type: string | null
          template_name: string
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_public?: boolean | null
          report_type?: string | null
          template_name: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_public?: boolean | null
          report_type?: string | null
          template_name?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      retailer_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          typical_base_rate: number | null
          typical_load_per_sqm: number | null
          typical_ti_rate: number | null
          updated_at: string | null
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          typical_base_rate?: number | null
          typical_load_per_sqm?: number | null
          typical_ti_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          category_code?: string
          category_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          typical_base_rate?: number | null
          typical_load_per_sqm?: number | null
          typical_ti_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      retailer_master: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          notes: string | null
          retailer_name: string
          typical_area_max: number | null
          typical_area_min: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          notes?: string | null
          retailer_name: string
          typical_area_max?: number | null
          typical_area_min?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          notes?: string | null
          retailer_name?: string
          typical_area_max?: number | null
          typical_area_min?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retailer_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "retailer_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      review_recommendation_progress: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          recommendation_key: string
          recommendation_title: string
          recommendation_type: string
          review_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          recommendation_key: string
          recommendation_title: string
          recommendation_type: string
          review_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          recommendation_key?: string
          recommendation_title?: string
          recommendation_type?: string
          review_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_recommendation_progress_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "application_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      running_recovery_settings: {
        Row: {
          created_at: string
          diesel_price_per_litre: number
          expected_hours_per_month: number
          fuel_consumption_rate: number
          generator_zone_id: string | null
          id: string
          kva_to_kwh_conversion: number
          net_energy_kva: number
          plant_name: string
          project_id: string
          running_load: number
          servicing_cost_per_250_hours: number
          servicing_cost_per_year: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          diesel_price_per_litre?: number
          expected_hours_per_month?: number
          fuel_consumption_rate?: number
          generator_zone_id?: string | null
          id?: string
          kva_to_kwh_conversion?: number
          net_energy_kva?: number
          plant_name?: string
          project_id: string
          running_load?: number
          servicing_cost_per_250_hours?: number
          servicing_cost_per_year?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          diesel_price_per_litre?: number
          expected_hours_per_month?: number
          fuel_consumption_rate?: number
          generator_zone_id?: string | null
          id?: string
          kva_to_kwh_conversion?: number
          net_energy_kva?: number
          plant_name?: string
          project_id?: string
          running_load?: number
          servicing_cost_per_250_hours?: number
          servicing_cost_per_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "running_recovery_settings_generator_zone_id_fkey"
            columns: ["generator_zone_id"]
            isOneToOne: false
            referencedRelation: "generator_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean | null
          project_id: string
          subsection_id: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean | null
          project_id: string
          subsection_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean | null
          project_id?: string
          subsection_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_diary_entries: {
        Row: {
          attachments: Json | null
          attendees: Json | null
          created_at: string
          created_by: string
          entry_date: string
          id: string
          meeting_minutes: string | null
          notes: string | null
          project_id: string
          queries: string | null
          site_progress: string | null
          sub_entries: Json | null
          updated_at: string
          weather_conditions: string | null
        }
        Insert: {
          attachments?: Json | null
          attendees?: Json | null
          created_at?: string
          created_by: string
          entry_date: string
          id?: string
          meeting_minutes?: string | null
          notes?: string | null
          project_id: string
          queries?: string | null
          site_progress?: string | null
          sub_entries?: Json | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Update: {
          attachments?: Json | null
          attendees?: Json | null
          created_at?: string
          created_by?: string
          entry_date?: string
          id?: string
          meeting_minutes?: string | null
          notes?: string | null
          project_id?: string
          queries?: string | null
          site_progress?: string | null
          sub_entries?: Json | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_diary_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_diary_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_diary_tasks: {
        Row: {
          actual_hours: number | null
          assigned_by: string
          assigned_to: string | null
          completion_date: string | null
          created_at: string
          dependencies: Json | null
          description: string | null
          diary_entry_id: string | null
          due_date: string | null
          estimated_hours: number | null
          group_id: string | null
          id: string
          position: number | null
          priority: Database["public"]["Enums"]["task_priority"]
          progress: number | null
          project_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_tracked_hours: number | null
          title: string
          updated_at: string
          view_type: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_by: string
          assigned_to?: string | null
          completion_date?: string | null
          created_at?: string
          dependencies?: Json | null
          description?: string | null
          diary_entry_id?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          group_id?: string | null
          id?: string
          position?: number | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number | null
          project_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          time_tracked_hours?: number | null
          title: string
          updated_at?: string
          view_type?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_by?: string
          assigned_to?: string | null
          completion_date?: string | null
          created_at?: string
          dependencies?: Json | null
          description?: string | null
          diary_entry_id?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          group_id?: string | null
          id?: string
          position?: number | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number | null
          project_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          time_tracked_hours?: number | null
          title?: string
          updated_at?: string
          view_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_diary_tasks_diary_entry_id_fkey"
            columns: ["diary_entry_id"]
            isOneToOne: false
            referencedRelation: "site_diary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_diary_tasks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "task_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_diary_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          section_content: string | null
          section_number: string
          section_title: string
          spec_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          section_content?: string | null
          section_number: string
          section_title: string
          spec_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          section_content?: string | null
          section_number?: string
          section_title?: string
          spec_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      specification_tables: {
        Row: {
          created_at: string
          display_order: number
          id: string
          section_id: string
          table_data: Json
          table_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          section_id: string
          table_data?: Json
          table_title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          section_id?: string
          table_data?: Json
          table_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      specification_terms: {
        Row: {
          created_at: string
          definition: string
          display_order: number
          id: string
          spec_id: string
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          definition: string
          display_order?: number
          id?: string
          spec_id: string
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          definition?: string
          display_order?: number
          id?: string
          spec_id?: string
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_notifications: {
        Row: {
          created_at: string
          description: string
          email_sent: boolean | null
          id: string
          is_read: boolean | null
          link: string | null
          metadata: Json | null
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          metadata?: Json | null
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          metadata?: Json | null
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      storage_providers: {
        Row: {
          config: Json | null
          created_at: string | null
          credentials: Json | null
          enabled: boolean | null
          id: string
          last_tested_at: string | null
          provider_name: string
          test_status: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          credentials?: Json | null
          enabled?: boolean | null
          id?: string
          last_tested_at?: string | null
          provider_name: string
          test_status?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          credentials?: Json | null
          enabled?: boolean | null
          id?: string
          last_tested_at?: string | null
          provider_name?: string
          test_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          additional_context: string | null
          admin_notes: string | null
          admin_response: string | null
          attachments: Json | null
          browser_info: Json | null
          category: string
          console_logs: string | null
          created_at: string
          description: string
          id: string
          needs_user_attention: boolean | null
          page_url: string
          priority: string
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          responded_at: string | null
          responded_by: string | null
          screenshot_url: string | null
          status: string
          title: string
          updated_at: string
          user_email: string
          user_name: string | null
          user_verification_response: string | null
          user_verified: boolean | null
          user_verified_at: string | null
          verification_requested_at: string | null
        }
        Insert: {
          additional_context?: string | null
          admin_notes?: string | null
          admin_response?: string | null
          attachments?: Json | null
          browser_info?: Json | null
          category?: string
          console_logs?: string | null
          created_at?: string
          description: string
          id?: string
          needs_user_attention?: boolean | null
          page_url: string
          priority?: string
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          screenshot_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_email: string
          user_name?: string | null
          user_verification_response?: string | null
          user_verified?: boolean | null
          user_verified_at?: string | null
          verification_requested_at?: string | null
        }
        Update: {
          additional_context?: string | null
          admin_notes?: string | null
          admin_response?: string | null
          attachments?: Json | null
          browser_info?: Json | null
          category?: string
          console_logs?: string | null
          created_at?: string
          description?: string
          id?: string
          needs_user_attention?: boolean | null
          page_url?: string
          priority?: string
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          screenshot_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_email?: string
          user_name?: string | null
          user_verification_response?: string | null
          user_verified?: boolean | null
          user_verified_at?: string | null
          verification_requested_at?: string | null
        }
        Relationships: []
      }
      task_activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "site_diary_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_by: string
          assigned_to: string
          contractor_company: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          status: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          contractor_company?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          contractor_company?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "site_diary_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "site_diary_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string | null
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string | null
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string | null
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "site_diary_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "site_diary_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_groups: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          position: number
          project_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          position?: number
          project_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          position?: number
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_label_assignments: {
        Row: {
          created_at: string | null
          label_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          label_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_label_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "site_diary_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          project_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          project_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_labels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reminders: {
        Row: {
          created_at: string
          id: string
          project_id: string
          reminder_time: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          reminder_time: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          reminder_time?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reminders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtasks: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          parent_task_id: string
          position: number
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          parent_task_id: string
          position?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          parent_task_id?: string
          position?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "site_diary_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          is_important: boolean
          is_urgent: boolean
          priority: string
          project_id: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_important?: boolean
          is_urgent?: boolean
          priority?: string
          project_id: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_important?: boolean
          is_urgent?: boolean
          priority?: string
          project_id?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      template_test_runs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          output_file_url: string | null
          run_by: string | null
          status: string | null
          template_id: string | null
          test_data: Json
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          output_file_url?: string | null
          run_by?: string | null
          status?: string | null
          template_id?: string | null
          test_data: Json
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          output_file_url?: string | null
          run_by?: string | null
          status?: string | null
          template_id?: string | null
          test_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "template_test_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_change_audit_log: {
        Row: {
          change_type: string
          changed_at: string | null
          changed_by: string | null
          changed_fields: Json | null
          id: string
          new_values: Json | null
          old_values: Json | null
          project_id: string
          tenant_id: string | null
          version_id: string | null
        }
        Insert: {
          change_type: string
          changed_at?: string | null
          changed_by?: string | null
          changed_fields?: Json | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          project_id: string
          tenant_id?: string | null
          version_id?: string | null
        }
        Update: {
          change_type?: string
          changed_at?: string | null
          changed_by?: string | null
          changed_fields?: Json | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          project_id?: string
          tenant_id?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_change_audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_change_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_change_audit_log_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "tenant_schedule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_document_exclusions: {
        Row: {
          created_at: string
          document_type: string
          exclusion_reason: string
          id: string
          marked_at: string
          marked_by: string
          notes: string | null
          project_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          exclusion_reason?: string
          id?: string
          marked_at?: string
          marked_by: string
          notes?: string | null
          project_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          exclusion_reason?: string
          id?: string
          marked_at?: string
          marked_by?: string
          notes?: string | null
          project_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_document_exclusions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_document_exclusions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          notes: string | null
          project_id: string
          tenant_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          file_size?: number | null
          file_url: string
          id?: string
          notes?: string | null
          project_id: string
          tenant_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          notes?: string | null
          project_id?: string
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_field_config: {
        Row: {
          created_at: string | null
          field_order: Json | null
          id: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          field_order?: Json | null
          id?: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          field_order?: Json | null
          id?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_field_config_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_floor_plan_masks: {
        Row: {
          area: number
          color: string
          created_at: string | null
          id: string
          points: Json
          project_id: string
          shop_number: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          area: number
          color: string
          created_at?: string | null
          id?: string
          points: Json
          project_id: string
          shop_number: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: number
          color?: string
          created_at?: string | null
          id?: string
          points?: Json
          project_id?: string
          shop_number?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_floor_plan_zones: {
        Row: {
          category: string | null
          color: string
          created_at: string
          id: string
          project_id: string
          tenant_id: string | null
          tenant_name: string | null
          updated_at: string
          zone_points: Json
        }
        Insert: {
          category?: string | null
          color: string
          created_at?: string
          id?: string
          project_id: string
          tenant_id?: string | null
          tenant_name?: string | null
          updated_at?: string
          zone_points: Json
        }
        Update: {
          category?: string | null
          color?: string
          created_at?: string
          id?: string
          project_id?: string
          tenant_id?: string | null
          tenant_name?: string | null
          updated_at?: string
          zone_points?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tenant_floor_plan_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_floor_plan_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_kw_override_audit: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string
          created_at: string
          id: string
          new_value: number | null
          notes: string | null
          old_value: number | null
          project_id: string
          tenant_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by: string
          created_at?: string
          id?: string
          new_value?: number | null
          notes?: string | null
          old_value?: number | null
          project_id: string
          tenant_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string
          created_at?: string
          id?: string
          new_value?: number | null
          notes?: string | null
          old_value?: number | null
          project_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_kw_override_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_notification_settings: {
        Row: {
          bo_critical_days: number | null
          bo_info_days: number | null
          bo_warning_days: number | null
          cost_entry_critical_days: number | null
          cost_entry_warning_days: number | null
          created_at: string | null
          email_frequency: string | null
          email_notifications_enabled: boolean | null
          id: string
          inactive_tenant_days: number | null
          notification_cooldown_hours: number | null
          notification_email: string | null
          notifications_enabled: boolean | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          bo_critical_days?: number | null
          bo_info_days?: number | null
          bo_warning_days?: number | null
          cost_entry_critical_days?: number | null
          cost_entry_warning_days?: number | null
          created_at?: string | null
          email_frequency?: string | null
          email_notifications_enabled?: boolean | null
          id?: string
          inactive_tenant_days?: number | null
          notification_cooldown_hours?: number | null
          notification_email?: string | null
          notifications_enabled?: boolean | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bo_critical_days?: number | null
          bo_info_days?: number | null
          bo_warning_days?: number | null
          cost_entry_critical_days?: number | null
          cost_entry_warning_days?: number | null
          created_at?: string | null
          email_frequency?: string | null
          email_notifications_enabled?: boolean | null
          id?: string
          inactive_tenant_days?: number | null
          notification_cooldown_hours?: number | null
          notification_email?: string | null
          notifications_enabled?: boolean | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_notification_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_report_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          settings: Json
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          settings: Json
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          settings?: Json
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_report_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_schedule_versions: {
        Row: {
          change_summary: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          project_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          project_id: string
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          project_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_schedule_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_tracker_reports: {
        Row: {
          created_at: string
          file_path: string
          file_size: number | null
          generated_at: string
          generated_by: string | null
          id: string
          notes: string | null
          project_id: string
          report_name: string
          revision_number: number
          tenant_count: number | null
          total_area: number | null
          total_db_cost: number | null
          total_lighting_cost: number | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          project_id: string
          report_name: string
          revision_number?: number
          tenant_count?: number | null
          total_area?: number | null
          total_db_cost?: number | null
          total_lighting_cost?: number | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          report_name?: string
          revision_number?: number
          tenant_count?: number | null
          total_area?: number | null
          total_db_cost?: number | null
          total_lighting_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_tracker_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          area: number | null
          beneficial_occupation_days: number | null
          cost_report_amount: number | null
          cost_reported: boolean | null
          created_at: string | null
          custom_fields: Json | null
          db_by_tenant: boolean | null
          db_cost: number | null
          db_order_date: string | null
          db_ordered: boolean | null
          db_size_allowance: string | null
          db_size_scope_of_work: string | null
          generator_loading_sector_1: number | null
          generator_loading_sector_2: number | null
          generator_zone_id: string | null
          id: string
          last_modified_at: string | null
          last_modified_by: string | null
          last_notification_sent: string | null
          layout_received: boolean | null
          lighting_by_tenant: boolean | null
          lighting_cost: number | null
          lighting_order_date: string | null
          lighting_ordered: boolean | null
          manual_kw_override: number | null
          opening_date: string | null
          own_generator_provided: boolean | null
          project_id: string
          shop_category: string
          shop_name: string
          shop_number: string
          sow_received: boolean | null
          updated_at: string | null
          zone_color: string | null
          zone_points: Json | null
        }
        Insert: {
          area?: number | null
          beneficial_occupation_days?: number | null
          cost_report_amount?: number | null
          cost_reported?: boolean | null
          created_at?: string | null
          custom_fields?: Json | null
          db_by_tenant?: boolean | null
          db_cost?: number | null
          db_order_date?: string | null
          db_ordered?: boolean | null
          db_size_allowance?: string | null
          db_size_scope_of_work?: string | null
          generator_loading_sector_1?: number | null
          generator_loading_sector_2?: number | null
          generator_zone_id?: string | null
          id?: string
          last_modified_at?: string | null
          last_modified_by?: string | null
          last_notification_sent?: string | null
          layout_received?: boolean | null
          lighting_by_tenant?: boolean | null
          lighting_cost?: number | null
          lighting_order_date?: string | null
          lighting_ordered?: boolean | null
          manual_kw_override?: number | null
          opening_date?: string | null
          own_generator_provided?: boolean | null
          project_id: string
          shop_category?: string
          shop_name: string
          shop_number: string
          sow_received?: boolean | null
          updated_at?: string | null
          zone_color?: string | null
          zone_points?: Json | null
        }
        Update: {
          area?: number | null
          beneficial_occupation_days?: number | null
          cost_report_amount?: number | null
          cost_reported?: boolean | null
          created_at?: string | null
          custom_fields?: Json | null
          db_by_tenant?: boolean | null
          db_cost?: number | null
          db_order_date?: string | null
          db_ordered?: boolean | null
          db_size_allowance?: string | null
          db_size_scope_of_work?: string | null
          generator_loading_sector_1?: number | null
          generator_loading_sector_2?: number | null
          generator_zone_id?: string | null
          id?: string
          last_modified_at?: string | null
          last_modified_by?: string | null
          last_notification_sent?: string | null
          layout_received?: boolean | null
          lighting_by_tenant?: boolean | null
          lighting_cost?: number | null
          lighting_order_date?: string | null
          lighting_ordered?: boolean | null
          manual_kw_override?: number | null
          opening_date?: string | null
          own_generator_provided?: boolean | null
          project_id?: string
          shop_category?: string
          shop_name?: string
          shop_number?: string
          sow_received?: boolean | null
          updated_at?: string | null
          zone_color?: string | null
          zone_points?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_generator_zone_id_fkey"
            columns: ["generator_zone_id"]
            isOneToOne: false
            referencedRelation: "generator_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action_description: string
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          project_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          project_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          project_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
        }
        Insert: {
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
        }
        Update: {
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reminders: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          project_id: string
          reminder_date: string
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          project_id: string
          reminder_date: string
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          project_id?: string
          reminder_date?: string
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reminders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "site_diary_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variation_line_items: {
        Row: {
          amount: number
          comments: string | null
          created_at: string | null
          description: string
          display_order: number
          id: string
          line_number: number
          quantity: number
          rate: number
          updated_at: string | null
          variation_id: string
        }
        Insert: {
          amount?: number
          comments?: string | null
          created_at?: string | null
          description: string
          display_order?: number
          id?: string
          line_number: number
          quantity?: number
          rate?: number
          updated_at?: string | null
          variation_id: string
        }
        Update: {
          amount?: number
          comments?: string | null
          created_at?: string | null
          description?: string
          display_order?: number
          id?: string
          line_number?: number
          quantity?: number
          rate?: number
          updated_at?: string | null
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variation_line_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "cost_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reports: {
        Row: {
          created_at: string
          created_by: string
          id: string
          project_id: string
          report_data: Json
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          report_data?: Json
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          report_data?: Json
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_generators: {
        Row: {
          created_at: string | null
          generator_cost: number | null
          generator_number: number
          generator_size: string | null
          id: string
          updated_at: string | null
          zone_id: string
        }
        Insert: {
          created_at?: string | null
          generator_cost?: number | null
          generator_number: number
          generator_size?: string | null
          id?: string
          updated_at?: string | null
          zone_id: string
        }
        Update: {
          created_at?: string | null
          generator_cost?: number | null
          generator_number?: number
          generator_size?: string | null
          id?: string
          updated_at?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_generators_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "generator_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          area_sqm: number | null
          color: string | null
          created_at: string | null
          floor_plan_id: string
          id: string
          name: string | null
          points: Json
          roof_azimuth: number | null
          roof_pitch: number | null
          zone_type: string
        }
        Insert: {
          area_sqm?: number | null
          color?: string | null
          created_at?: string | null
          floor_plan_id: string
          id?: string
          name?: string | null
          points: Json
          roof_azimuth?: number | null
          roof_pitch?: number | null
          zone_type: string
        }
        Update: {
          area_sqm?: number | null
          color?: string | null
          created_at?: string | null
          floor_plan_id?: string
          id?: string
          name?: string | null
          points?: Json
          roof_azimuth?: number | null
          roof_pitch?: number | null
          zone_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      client_has_project_access: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      generate_client_portal_token: {
        Args: { p_email: string; p_expiry_hours?: number; p_project_id: string }
        Returns: string
      }
      generate_review_access_token: { Args: never; Returns: string }
      get_current_tenant_schedule_version: {
        Args: { p_project_id: string }
        Returns: number
      }
      get_next_employee_number: { Args: never; Returns: string }
      has_project_access: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_client_portal_token: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      increment_tenant_schedule_version: {
        Args: { p_change_summary: string; p_project_id: string }
        Returns: string
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      log_user_activity: {
        Args: {
          p_action_description: string
          p_action_type: string
          p_metadata?: Json
          p_project_id?: string
          p_user_id: string
        }
        Returns: string
      }
      user_has_floor_plan_access: {
        Args: { _floor_plan_id: string }
        Returns: boolean
      }
      user_has_project_access: {
        Args: { _project_id: string }
        Returns: boolean
      }
      validate_client_portal_token: {
        Args: { p_ip_address?: string; p_token: string; p_user_agent?: string }
        Returns: {
          email: string
          expires_at: string
          is_valid: boolean
          project_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator" | "client"
      attendance_type: "clock_in" | "clock_out" | "break_start" | "break_end"
      cable_type:
        | "mv"
        | "lv_ac"
        | "dc"
        | "tray"
        | "basket"
        | "trunking"
        | "sleeve"
      design_purpose:
        | "budget_markup"
        | "pv_design"
        | "line_shop_measurements"
        | "general"
        | "cable_schedule"
      employment_status: "active" | "inactive" | "on_leave" | "terminated"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      onboarding_status: "not_started" | "in_progress" | "completed"
      review_status: "draft" | "pending" | "completed"
      section_review_status:
        | "draft"
        | "sent_for_review"
        | "under_review"
        | "disputed"
        | "approved"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "moderator", "client"],
      attendance_type: ["clock_in", "clock_out", "break_start", "break_end"],
      cable_type: ["mv", "lv_ac", "dc", "tray", "basket", "trunking", "sleeve"],
      design_purpose: [
        "budget_markup",
        "pv_design",
        "line_shop_measurements",
        "general",
        "cable_schedule",
      ],
      employment_status: ["active", "inactive", "on_leave", "terminated"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      onboarding_status: ["not_started", "in_progress", "completed"],
      review_status: ["draft", "pending", "completed"],
      section_review_status: [
        "draft",
        "sent_for_review",
        "under_review",
        "disputed",
        "approved",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      user_role: ["admin", "user"],
    },
  },
} as const
