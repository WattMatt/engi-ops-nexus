import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Trash2, TestTube } from "lucide-react";
import { toast } from "sonner";
import { UploadTemplateDialog } from "@/components/document-templates/UploadTemplateDialog";
import { TestTemplateDialog } from "@/components/document-templates/TestTemplateDialog";
import { FillTemplateDialog } from "@/components/document-templates/FillTemplateDialog";

export default function DocumentTemplates() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [fillDialogOpen, setFillDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates?.find((t) => t.id === templateId);
      if (!template) throw new Error("Template not found");

      // Delete file from storage
      const filePath = template.file_url.split("/").pop();
      await supabase.storage.from("document-templates").remove([filePath]);

      // Delete database record
      const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });

  const handleTest = (template: any) => {
    setSelectedTemplate(template);
    setTestDialogOpen(true);
  };

  const handleFill = (template: any) => {
    setSelectedTemplate(template);
    setFillDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Document Templates</h1>
          <p className="text-muted-foreground mt-2">
            Upload and test Word document templates with placeholder data
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading templates...</div>
      ) : templates?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first document template to get started
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates?.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {template.name}
                </CardTitle>
                {template.description && (
                  <CardDescription>{template.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{template.template_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File:</span>
                    <span className="font-medium truncate ml-2">
                      {template.file_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uploaded:</span>
                    <span className="font-medium">
                      {new Date(template.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleFill(template)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Fill & Convert
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleTest(template)}
                  >
                    <TestTube className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteMutation.mutate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UploadTemplateDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      <TestTemplateDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        template={selectedTemplate}
      />

      <FillTemplateDialog
        open={fillDialogOpen}
        onOpenChange={setFillDialogOpen}
        template={selectedTemplate}
      />
    </div>
  );
}
