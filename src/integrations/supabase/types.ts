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
      cable_routes: {
        Row: {
          cable_spec: string | null
          color: string | null
          created_at: string | null
          floor_plan_id: string
          id: string
          length_meters: number | null
          name: string | null
          points: Json
          route_type: Database["public"]["Enums"]["cable_type"]
          size: string | null
          supply_from: string | null
          supply_to: string | null
        }
        Insert: {
          cable_spec?: string | null
          color?: string | null
          created_at?: string | null
          floor_plan_id: string
          id?: string
          length_meters?: number | null
          name?: string | null
          points: Json
          route_type: Database["public"]["Enums"]["cable_type"]
          size?: string | null
          supply_from?: string | null
          supply_to?: string | null
        }
        Update: {
          cable_spec?: string | null
          color?: string | null
          created_at?: string | null
          floor_plan_id?: string
          id?: string
          length_meters?: number | null
          name?: string | null
          points?: Json
          route_type?: Database["public"]["Enums"]["cable_type"]
          size?: string | null
          supply_from?: string | null
          supply_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cable_routes_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
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
      electrical_budgets: {
        Row: {
          budget_date: string
          budget_number: string
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
      equipment_placements: {
        Row: {
          created_at: string | null
          equipment_type: string
          floor_plan_id: string
          id: string
          name: string | null
          properties: Json | null
          rotation: number | null
          x_position: number
          y_position: number
        }
        Insert: {
          created_at?: string | null
          equipment_type: string
          floor_plan_id: string
          id?: string
          name?: string | null
          properties?: Json | null
          rotation?: number | null
          x_position: number
          y_position: number
        }
        Update: {
          created_at?: string | null
          equipment_type?: string
          floor_plan_id?: string
          id?: string
          name?: string | null
          properties?: Json | null
          rotation?: number | null
          x_position?: number
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_placements_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plans: {
        Row: {
          created_at: string | null
          created_by: string
          design_purpose: Database["public"]["Enums"]["design_purpose"]
          id: string
          name: string
          pdf_url: string
          project_id: string
          pv_panel_length: number | null
          pv_panel_wattage: number | null
          pv_panel_width: number | null
          scale_meters_per_pixel: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          design_purpose?: Database["public"]["Enums"]["design_purpose"]
          id?: string
          name: string
          pdf_url: string
          project_id: string
          pv_panel_length?: number | null
          pv_panel_wattage?: number | null
          pv_panel_width?: number | null
          scale_meters_per_pixel?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          design_purpose?: Database["public"]["Enums"]["design_purpose"]
          id?: string
          name?: string
          pdf_url?: string
          project_id?: string
          pv_panel_length?: number | null
          pv_panel_wattage?: number | null
          pv_panel_width?: number | null
          scale_meters_per_pixel?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
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
      projects: {
        Row: {
          cctv_contractor: string | null
          client_logo_url: string | null
          client_name: string | null
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
        Relationships: [
          {
            foreignKeyName: "pv_arrays_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      site_diary_entries: {
        Row: {
          attachments: Json | null
          created_at: string
          created_by: string
          entry_date: string
          id: string
          notes: string | null
          project_id: string
          queries: string | null
          site_progress: string | null
          updated_at: string
          weather_conditions: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          created_by: string
          entry_date: string
          id?: string
          notes?: string | null
          project_id: string
          queries?: string | null
          site_progress?: string | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          created_by?: string
          entry_date?: string
          id?: string
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
        Relationships: [
          {
            foreignKeyName: "zones_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
      cable_type: ["mv", "lv_ac", "dc", "tray", "basket", "trunking", "sleeve"],
      design_purpose: [
        "budget_markup",
        "pv_design",
        "line_shop_measurements",
        "general",
      ],
      user_role: ["admin", "user"],
    },
  },
} as const
