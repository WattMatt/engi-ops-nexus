import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ReportSettings {
  id?: string;
  user_id?: string;
  project_id?: string;
  include_cover_page: boolean;
  cover_layout: {
    style: string;
    elements: any[];
  };
  sections_order: string[];
  font_family: string;
  font_size: number;
  primary_color: string;
  secondary_color: string;
  header_style: {
    fontSize: number;
    bold: boolean;
    color: string;
  };
  footer_style: {
    fontSize: number;
    color: string;
  };
  table_style: {
    headerBg: string;
    headerColor: string;
    cellPadding: number;
    borderWidth: number;
  };
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  line_spacing: number;
  paragraph_spacing: number;
  page_orientation: "portrait" | "landscape";
  company_logo_url?: string;
  watermark_text?: string;
  watermark_opacity: number;
  background_pattern?: string;
  company_name?: string;
  company_tagline?: string;
  company_contact: any;
  author_name?: string;
  show_page_numbers: boolean;
  show_date: boolean;
  is_template: boolean;
  template_name?: string;
}

export const DEFAULT_SETTINGS: ReportSettings = {
  include_cover_page: true,
  cover_layout: { style: "modern", elements: [] },
  sections_order: [],
  font_family: "Helvetica",
  font_size: 10,
  primary_color: "#1e40af",
  secondary_color: "#64748b",
  header_style: { fontSize: 12, bold: true, color: "#1e40af" },
  footer_style: { fontSize: 9, color: "#64748b" },
  table_style: {
    headerBg: "#1e40af",
    headerColor: "#ffffff",
    cellPadding: 3,
    borderWidth: 0.5,
  },
  margins: { top: 20, bottom: 20, left: 15, right: 15 },
  line_spacing: 1.15,
  paragraph_spacing: 6,
  page_orientation: "landscape",
  watermark_opacity: 0.1,
  company_contact: {},
  show_page_numbers: true,
  show_date: true,
  is_template: false,
};

export function useReportSettings(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["report-settings", projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("report_settings")
        .select("*")
        .eq("user_id", user.id);

      if (projectId) {
        query = query.eq("project_id", projectId);
      } else {
        query = query.is("project_id", null);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(1).single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) return DEFAULT_SETTINGS;

      // Parse JSON fields to match ReportSettings type
      return {
        ...data,
        cover_layout: typeof data.cover_layout === 'string' 
          ? JSON.parse(data.cover_layout) 
          : data.cover_layout,
        sections_order: typeof data.sections_order === 'string'
          ? JSON.parse(data.sections_order)
          : data.sections_order,
        header_style: typeof data.header_style === 'string'
          ? JSON.parse(data.header_style)
          : data.header_style,
        footer_style: typeof data.footer_style === 'string'
          ? JSON.parse(data.footer_style)
          : data.footer_style,
        table_style: typeof data.table_style === 'string'
          ? JSON.parse(data.table_style)
          : data.table_style,
        margins: typeof data.margins === 'string'
          ? JSON.parse(data.margins)
          : data.margins,
        company_contact: typeof data.company_contact === 'string'
          ? JSON.parse(data.company_contact)
          : data.company_contact,
      } as ReportSettings;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: Partial<ReportSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const settingsToSave = {
        ...newSettings,
        user_id: user.id,
        project_id: projectId || null,
      };

      if (settings?.id) {
        const { data, error } = await supabase
          .from("report_settings")
          .update(settingsToSave)
          .eq("id", settings.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("report_settings")
          .insert(settingsToSave)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-settings", projectId] });
      toast({
        title: "Settings saved",
        description: "Report formatting settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}

export function useReportTemplates(reportType?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["report-templates", reportType],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("report_templates")
        .select("*")
        .or(`user_id.eq.${user.id},is_public.eq.true`);

      if (reportType) {
        query = query.or(`report_type.eq.${reportType},report_type.eq.all`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ 
      name, 
      description, 
      config, 
      reportType 
    }: { 
      name: string; 
      description?: string; 
      config: ReportSettings;
      reportType?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("report_templates")
        .insert({
          user_id: user.id,
          template_name: name,
          description: description || null,
          config: config as any,
          report_type: reportType || "all",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast({
        title: "Template saved",
        description: "Report template has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("report_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast({
        title: "Template deleted",
        description: "Report template has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    isLoading,
    saveTemplate: saveTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    isSaving: saveTemplateMutation.isPending,
  };
}