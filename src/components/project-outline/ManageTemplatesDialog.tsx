import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Star, StarOff } from "lucide-react";
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

interface ManageTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplatesChange: () => void;
}

export const ManageTemplatesDialog = ({
  open,
  onOpenChange,
  onTemplatesChange,
}: ManageTemplatesDialogProps) => {
  const { toast } = useToast();
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const { data: templates, refetch } = useQuery({
    queryKey: ["project-outline-templates-manage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_outline_templates")
        .select("*, project_outline_template_sections(count)")
        .order("is_default", { ascending: false })
        .order("template_name");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleToggleDefault = async (templateId: string, currentDefault: boolean) => {
    try {
      const { data: user } = await supabase.auth.getUser();

      if (!currentDefault) {
        // Unset all defaults first
        await supabase
          .from("project_outline_templates")
          .update({ is_default: false })
          .eq("created_by", user?.user?.id);
      }

      // Toggle this template
      const { error } = await supabase
        .from("project_outline_templates")
        .update({ is_default: !currentDefault })
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: currentDefault ? "Default template unset" : "Default template set",
      });

      refetch();
      onTemplatesChange();
    } catch (error) {
      console.error("Error toggling default:", error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplateId) return;

    try {
      const { error } = await supabase
        .from("project_outline_templates")
        .delete()
        .eq("id", deleteTemplateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      setDeleteTemplateId(null);
      refetch();
      onTemplatesChange();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Outline Templates</DialogTitle>
          </DialogHeader>

          {!templates || templates.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No templates yet. Save your first template from an existing outline.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{template.template_name}</CardTitle>
                          {template.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        {template.description && (
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleDefault(template.id, template.is_default)}
                          title={template.is_default ? "Unset as default" : "Set as default"}
                        >
                          {template.is_default ? (
                            <Star className="h-4 w-4 fill-current" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTemplateId(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {template.project_outline_template_sections?.[0]?.count || 0} sections
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
    </>
  );
};
