import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, Edit, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
}

export const TemplateLibrary = ({
  projectId,
  category,
  onSelectTemplate,
  onCreateNew,
}: TemplateLibraryProps) => {
  const { toast } = useToast();
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ["pdf-templates", projectId, category],
    queryFn: async () => {
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">PDF Templates</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage reusable PDF templates
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates && templates.length > 0 ? (
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
              <p className="text-sm text-muted-foreground">
                Create your first PDF template to get started
              </p>
            </div>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Template
            </Button>
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
