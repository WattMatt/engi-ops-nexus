import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, Edit, Star, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStarterTemplateForCategory, getTemplateDescription } from "./StarterTemplates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface TemplateLibraryProps {
  projectId: string;
  category?: string;
  onSelectTemplate: (templateId: string) => void;
  onCreateNew: () => void;
  onProjectChange?: (projectId: string) => void;
}

export const TemplateLibrary = ({
  projectId,
  category,
  onSelectTemplate,
  onCreateNew,
  onProjectChange,
}: TemplateLibraryProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ["pdf-templates", projectId, category],
    queryFn: async () => {
      if (!projectId) return [];
      
      let query = supabase
        .from("pdf_templates")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleDelete = async () => {
    if (!deleteTemplateId) return;

    try {
      const { error } = await supabase
        .from("pdf_templates")
        .delete()
        .eq("id", deleteTemplateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      refetch();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    } finally {
      setDeleteTemplateId(null);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      // Unset all defaults for this category and project
      await supabase
        .from("pdf_templates")
        .update({ is_default: false })
        .eq("project_id", projectId)
        .eq("category", category || "");

      // Set the selected template as default
      const { error } = await supabase
        .from("pdf_templates")
        .update({ is_default: true })
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default template updated",
      });

      refetch();
    } catch (error) {
      console.error("Set default error:", error);
      toast({
        title: "Error",
        description: "Failed to set default template",
        variant: "destructive",
      });
    }
  };

  const createFromStarter = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const starterTemplate = getStarterTemplateForCategory(category || "cost_report");
      if (!starterTemplate) throw new Error("No starter template for this category");
      
      const { data, error } = await supabase
        .from("pdf_templates")
        .insert([{
          project_id: projectId,
          name: `${getCategoryLabel(category || "cost_report")} - Starter Template`,
          description: getTemplateDescription(category || "cost_report"),
          category: category || "cost_report",
          template_json: starterTemplate as any,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });
      onSelectTemplate(data.id);

      toast({
        title: "Success",
        description: "Starter template created! Field names will auto-fill with your data.",
      });
    } catch (error) {
      console.error("Error creating starter template:", error);
      toast({
        title: "Error",
        description: "Failed to create starter template",
        variant: "destructive",
      });
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      cost_report: "Cost Report",
      tenant_report: "Tenant Report",
      cable_schedule: "Cable Schedule",
      final_account: "Final Account",
      bulk_services: "Bulk Services",
    };
    return labels[cat] || cat;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-xs">
          <Select value={projectId} onValueChange={onProjectChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {projectId && (
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        )}
      </div>

      {!projectId ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Select a Project</h3>
              <p className="text-sm text-muted-foreground">
                Choose a project above to view and manage its PDF templates
              </p>
            </div>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading templates...</div>
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="relative group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="h-8 w-8 text-primary" />
                  {template.is_default && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>
                <CardTitle className="flex items-center gap-2">
                  {template.name}
                </CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{getCategoryLabel(template.category)}</Badge>
                    <span>•</span>
                    <span>{format(new Date(template.created_at), "MMM d, yyyy")}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onSelectTemplate(template.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {!template.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(template.id)}
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTemplateId(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">No templates yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Start with a pre-configured template that auto-fills data, or create your own from scratch
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={createFromStarter}>
                <Sparkles className="h-4 w-4 mr-2" />
                Create from Starter
              </Button>
              <Button onClick={onCreateNew} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Blank Template
              </Button>
            </div>
          </div>
        </Card>
      )}

      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
