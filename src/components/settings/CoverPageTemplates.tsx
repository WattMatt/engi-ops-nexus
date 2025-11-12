import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Star, StarOff, FileImage, Loader2, Eye } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const CoverPageTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["cover-page-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cover_page_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Upload template mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      console.log("Starting template upload...");
      if (!selectedFile || !templateName.trim()) {
        throw new Error("Please provide a template name and select a file");
      }

      console.log("File selected:", selectedFile.name, selectedFile.type);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      console.log("User authenticated:", user.id);

      // Upload file to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}_${templateName.replace(/\s+/g, "_")}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      console.log("Uploading to storage:", filePath);

      const { error: uploadError } = await supabase.storage
        .from("cover-page-templates")
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      console.log("Storage upload successful, saving to database...");

      // Save to database
      const { error: dbError } = await supabase
        .from("cover_page_templates")
        .insert({
          name: templateName,
          file_path: filePath,
          file_type: selectedFile.type,
          created_by: user.id,
        });

      if (dbError) {
        console.error("Database insert error:", dbError);
        throw dbError;
      }

      console.log("Template saved successfully!");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cover-page-templates"] });
      toast({
        title: "Success",
        description: "Cover page template uploaded successfully",
      });
      setTemplateName("");
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById("template-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set default template mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // First, unset all defaults
      await supabase
        .from("cover_page_templates")
        .update({ is_default: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // Then set the new default
      const { error } = await supabase
        .from("cover_page_templates")
        .update({ is_default: true })
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cover-page-templates"] });
      toast({
        title: "Success",
        description: "Default template updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (template: any) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("cover-page-templates")
        .remove([template.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("cover_page_templates")
        .delete()
        .eq("id", template.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cover-page-templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      setDeletingTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file (JPG, PNG)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 20MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handlePreview = async (template: any) => {
    setPreviewTemplate(template);
    
    // Get public URL
    const { data } = supabase.storage
      .from("cover-page-templates")
      .getPublicUrl(template.file_path);

    setPreviewUrl(data.publicUrl);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cover Page Templates</CardTitle>
          <CardDescription>
            Upload and manage cover page templates for your reports. Templates can be PDF or image files (JPG, PNG) that will be used as backgrounds for report covers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Upload New Template</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Company Cover Page"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-file">Template File (PDF or Image)</Label>
                <Input
                  id="template-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!selectedFile || !templateName.trim() || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Template
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Templates List */}
          <div className="space-y-3">
            <h3 className="font-semibold">Existing Templates</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileImage className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.file_type} • {new Date(template.created_at).toLocaleDateString()}
                        </p>
                        {template.is_default && (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-medium">
                            <Star className="h-3 w-3 fill-current" />
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDefaultMutation.mutate(template.id)}
                        disabled={template.is_default || setDefaultMutation.isPending}
                      >
                        {template.is_default ? (
                          <Star className="h-4 w-4 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingTemplate(template)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No templates uploaded yet</p>
                <p className="text-sm mt-2">Upload your first template above</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => {
        setPreviewTemplate(null);
        setPreviewUrl(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            {previewUrl && previewTemplate?.file_type?.startsWith("image/") ? (
              <img src={previewUrl} alt={previewTemplate.name} className="w-full h-auto" />
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh]"
                title="Template Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplate && deleteMutation.mutate(deletingTemplate)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
