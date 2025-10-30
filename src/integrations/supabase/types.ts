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
      budget_line_items: {
        Row: {
          area: number | null
          area_unit: string | null
          base_rate: number | null
          created_at: string
          description: string
          display_order: number
          id: string
          item_number: string | null
          section_id: string
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
          item_number?: string | null
          section_id: string
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
          item_number?: string | null
          section_id?: string
          ti_rate?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: []
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
      cable_entries: {
        Row: {
          cable_number: number | null
          cable_size: string | null
          cable_tag: string
          cable_type: string | null
          created_at: string
          display_order: number
          extra_length: number | null
          floor_plan_cable_id: string | null
          from_location: string
          id: string
          install_cost: number | null
          load_amps: number | null
          measured_length: number | null
          notes: string | null
          ohm_per_km: number | null
          schedule_id: string
          supply_cost: number | null
          to_location: string
          total_cost: number | null
          total_length: number | null
          updated_at: string
          volt_drop: number | null
          voltage: number | null
        }
        Insert: {
          cable_number?: number | null
          cable_size?: string | null
          cable_tag: string
          cable_type?: string | null
          created_at?: string
          display_order?: number
          extra_length?: number | null
          floor_plan_cable_id?: string | null
          from_location: string
          id?: string
          install_cost?: number | null
          load_amps?: number | null
          measured_length?: number | null
          notes?: string | null
          ohm_per_km?: number | null
          schedule_id: string
          supply_cost?: number | null
          to_location: string
          total_cost?: number | null
          total_length?: number | null
          updated_at?: string
          volt_drop?: number | null
          voltage?: number | null
        }
        Update: {
          cable_number?: number | null
          cable_size?: string | null
          cable_tag?: string
          cable_type?: string | null
          created_at?: string
          display_order?: number
          extra_length?: number | null
          floor_plan_cable_id?: string | null
          from_location?: string
          id?: string
          install_cost?: number | null
          load_amps?: number | null
          measured_length?: number | null
          notes?: string | null
          ohm_per_km?: number | null
          schedule_id?: string
          supply_cost?: number | null
          to_location?: string
          total_cost?: number | null
          total_length?: number | null
          updated_at?: string
          volt_drop?: number | null
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cable_entries_floor_plan_cable_id_fkey"
            columns: ["floor_plan_cable_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_cables"
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
          company_logo_url: string | null
          company_name: string
          company_tagline: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_logo_url?: string | null
          company_name?: string
          company_tagline?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
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
      cost_variations: {
        Row: {
          amount: number
          code: string
          cost_report_id: string
          created_at: string | null
          description: string
          display_order: number
          id: string
          is_credit: boolean | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          code: string
          cost_report_id: string
          created_at?: string | null
          description: string
          display_order?: number
          id?: string
          is_credit?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          code?: string
          cost_report_id?: string
          created_at?: string | null
          description?: string
          display_order?: number
          id?: string
          is_credit?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
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
      electrical_budgets: {
        Row: {
          budget_date: string
          budget_number: string
          client_logo_url: string | null
          consultant_logo_url: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          prepared_by_contact: string | null
          prepared_for_company: string | null
          prepared_for_contact: string | null
          prepared_for_tel: string | null
          project_id: string
          revision: string
          updated_at: string
        }
        Insert: {
          budget_date: string
          budget_number: string
          client_logo_url?: string | null
          consultant_logo_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          prepared_by_contact?: string | null
          prepared_for_company?: string | null
          prepared_for_contact?: string | null
          prepared_for_tel?: string | null
          project_id: string
          revision?: string
          updated_at?: string
        }
        Update: {
          budget_date?: string
          budget_number?: string
          client_logo_url?: string | null
          consultant_logo_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          prepared_by_contact?: string | null
          prepared_for_company?: string | null
          prepared_for_contact?: string | null
          prepared_for_tel?: string | null
          project_id?: string
          revision?: string
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
          admin_notes: string | null
          browser_info: Json | null
          category: string
          created_at: string
          description: string
          id: string
          page_url: string
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          screenshot_url: string | null
          severity: string
          status: string
          updated_at: string
          user_email: string
          user_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          browser_info?: Json | null
          category?: string
          created_at?: string
          description: string
          id?: string
          page_url: string
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_email: string
          user_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          browser_info?: Json | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          page_url?: string
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_email?: string
          user_name?: string | null
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
          created_at: string
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          login_count: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          last_login_at?: string | null
          login_count?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          login_count?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
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
          cctv_contractor: string | null
          client_logo_url: string | null
          client_name: string | null
          consultant_logo_url: string | null
          created_at: string
          created_by: string
          description: string | null
          earthing_contractor: string | null
          electrical_contractor: string | null
          id: string
          name: string
          practical_completion_date: string | null
          project_logo_url: string | null
          project_number: string
          site_handover_date: string | null
          standby_plants_contractor: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          cctv_contractor?: string | null
          client_logo_url?: string | null
          client_name?: string | null
          consultant_logo_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          earthing_contractor?: string | null
          electrical_contractor?: string | null
          id?: string
          name: string
          practical_completion_date?: string | null
          project_logo_url?: string | null
          project_number: string
          site_handover_date?: string | null
          standby_plants_contractor?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          cctv_contractor?: string | null
          client_logo_url?: string | null
          client_name?: string | null
          consultant_logo_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          earthing_contractor?: string | null
          electrical_contractor?: string | null
          id?: string
          name?: string
          practical_completion_date?: string | null
          project_logo_url?: string | null
          project_number?: string
          site_handover_date?: string | null
          standby_plants_contractor?: string | null
          status?: string | null
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
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
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
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
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
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
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
          admin_notes: string | null
          browser_info: Json | null
          category: string
          created_at: string
          description: string
          id: string
          page_url: string
          priority: string
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          screenshot_url: string | null
          status: string
          title: string
          updated_at: string
          user_email: string
          user_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          browser_info?: Json | null
          category?: string
          created_at?: string
          description: string
          id?: string
          page_url: string
          priority?: string
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_email: string
          user_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          browser_info?: Json | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          page_url?: string
          priority?: string
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_email?: string
          user_name?: string | null
        }
        Relationships: []
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
      tenants: {
        Row: {
          area: number | null
          created_at: string | null
          custom_fields: Json | null
          db_cost: number | null
          db_ordered: boolean | null
          db_size: string | null
          id: string
          layout_received: boolean | null
          lighting_cost: number | null
          lighting_ordered: boolean | null
          project_id: string
          shop_name: string
          shop_number: string
          sow_received: boolean | null
          updated_at: string | null
          zone_color: string | null
          zone_points: Json | null
        }
        Insert: {
          area?: number | null
          created_at?: string | null
          custom_fields?: Json | null
          db_cost?: number | null
          db_ordered?: boolean | null
          db_size?: string | null
          id?: string
          layout_received?: boolean | null
          lighting_cost?: number | null
          lighting_ordered?: boolean | null
          project_id: string
          shop_name: string
          shop_number: string
          sow_received?: boolean | null
          updated_at?: string | null
          zone_color?: string | null
          zone_points?: Json | null
        }
        Update: {
          area?: number | null
          created_at?: string | null
          custom_fields?: Json | null
          db_cost?: number | null
          db_ordered?: boolean | null
          db_size?: string | null
          id?: string
          layout_received?: boolean | null
          lighting_cost?: number | null
          lighting_ordered?: boolean | null
          project_id?: string
          shop_name?: string
          shop_number?: string
          sow_received?: boolean | null
          updated_at?: string | null
          zone_color?: string | null
          zone_points?: Json | null
        }
        Relationships: [
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
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      get_next_employee_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_user_activity: {
        Args: {
          p_action_description: string
          p_action_type: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: string
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
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      user_role: ["admin", "user"],
    },
  },
} as const
