import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailSender {
  id: string;
  name: string;
  email_prefix: string;
  domain: string;
  full_email: string;
  display_name: string;
  is_predefined: boolean;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  sender_id: string | null;
  subject_template: string;
  html_content: string;
  json_content: any;
  plain_text_content: string | null;
  variables: any[];
  is_active: boolean;
  is_default: boolean;
  is_system: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  category?: EmailTemplateCategory;
  sender?: EmailSender;
}

export interface EmailTemplateVariant {
  id: string;
  template_id: string;
  variant_name: string;
  subject_template: string;
  html_content: string;
  json_content: any;
  weight: number;
  is_active: boolean;
}

// Senders
export function useEmailSenders() {
  return useQuery({
    queryKey: ["email-senders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_senders")
        .select("*")
        .order("is_predefined", { ascending: false })
        .order("name");
      
      if (error) throw error;
      return data as EmailSender[];
    },
  });
}

export function useCreateEmailSender() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sender: Omit<Partial<EmailSender>, 'id' | 'full_email' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("email_senders")
        .insert([sender as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-senders"] });
      toast.success("Email sender created");
    },
    onError: (error: any) => {
      toast.error("Failed to create sender", { description: error.message });
    },
  });
}

export function useUpdateEmailSender() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailSender> & { id: string }) => {
      const { data, error } = await supabase
        .from("email_senders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-senders"] });
      toast.success("Email sender updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update sender", { description: error.message });
    },
  });
}

export function useDeleteEmailSender() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_senders")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-senders"] });
      toast.success("Email sender deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete sender", { description: error.message });
    },
  });
}

// Categories
export function useEmailTemplateCategories() {
  return useQuery({
    queryKey: ["email-template-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_template_categories")
        .select("*")
        .order("display_order");
      
      if (error) throw error;
      return data as EmailTemplateCategory[];
    },
  });
}

// Templates
export function useEmailTemplates(categoryId?: string) {
  return useQuery({
    queryKey: ["email-templates", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("email_templates")
        .select(`
          *,
          category:email_template_categories(*),
          sender:email_senders(*)
        `)
        .order("name");
      
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

export function useEmailTemplate(id: string) {
  return useQuery({
    queryKey: ["email-template", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select(`
          *,
          category:email_template_categories(*),
          sender:email_senders(*)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as EmailTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: Partial<EmailTemplate>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        name: template.name!,
        subject_template: template.subject_template!,
        html_content: template.html_content!,
        description: template.description,
        category_id: template.category_id,
        sender_id: template.sender_id,
        json_content: template.json_content,
        variables: template.variables,
        is_active: template.is_active,
        is_default: template.is_default,
      };
      
      const { data, error } = await supabase
        .from("email_templates")
        .insert([insertData as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Email template created");
    },
    onError: (error: any) => {
      toast.error("Failed to create template", { description: error.message });
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailTemplate> & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // First, save current version to history
      const { data: current } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", id)
        .single();
      
      if (current) {
        await supabase.from("email_template_versions").insert({
          template_id: id,
          version: current.version,
          subject_template: current.subject_template,
          html_content: current.html_content,
          json_content: current.json_content,
          variables: current.variables,
          created_by: user?.id,
        });
      }
      
      // Update template with incremented version
      const { data, error } = await supabase
        .from("email_templates")
        .update({
          ...updates,
          updated_by: user?.id,
          version: (current?.version || 0) + 1,
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["email-template", variables.id] });
      toast.success("Email template saved");
    },
    onError: (error: any) => {
      toast.error("Failed to save template", { description: error.message });
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Email template deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete template", { description: error.message });
    },
  });
}

// Template Variants (A/B Testing)
export function useTemplateVariants(templateId: string) {
  return useQuery({
    queryKey: ["template-variants", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_template_variants")
        .select("*")
        .eq("template_id", templateId)
        .order("created_at");
      
      if (error) throw error;
      return data as EmailTemplateVariant[];
    },
    enabled: !!templateId,
  });
}

export function useCreateTemplateVariant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (variant: Partial<EmailTemplateVariant>) => {
      const { data, error } = await supabase
        .from("email_template_variants")
        .insert([variant as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["template-variants", variables.template_id] });
      toast.success("Variant created for A/B testing");
    },
    onError: (error: any) => {
      toast.error("Failed to create variant", { description: error.message });
    },
  });
}
