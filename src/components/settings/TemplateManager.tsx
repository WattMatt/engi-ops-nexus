import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Trash2, Star, Eye, FileText, Edit, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { PlaceholderQuickCopy } from "@/components/shared/PlaceholderQuickCopy";
import { WordDocumentEditor } from "./WordDocumentEditor";
import { generatePlaceholderDocument, TemplateType } from "@/utils/templatePlaceholderInsertion";
import { Packer } from "docx";

const TEMPLATE_TYPES = [
  { value: "cover_page", label: "📄 Cover Page" },
  { value: "cost_report", label: "💰 Cost Report" },
  { value: "cable_schedule", label: "🔌 Cable Schedule" },
  { value: "final_account", label: "📊 Final Account" },
  { value: "specification", label: "📝 Specification" },
  { value: "project_outline", label: "📋 Project Outline" },
  { value: "bulk_services", label: "⚡ Bulk Services" },
];

export const TemplateManager = () => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState<string>("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<any>(null);
  const [makingReady, setMakingReady] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
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

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !templateName || !templateType) {
        throw new Error("Please fill in all required fields");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("document_templates")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("document_templates")
        .getPublicUrl(filePath);

      if (isDefault) {
        await supabase
          .from("document_templates")
          .update({ is_default_cover: false })
          .eq("template_type", templateType);
      }

      const { error: dbError } = await supabase
        .from("document_templates")
        .insert({
          name: templateName,
          file_name: file.name,
          file_url: publicUrl,
          template_type: templateType,
          file_type: fileExt,
          is_active: isActive,
          is_default_cover: isDefault,
          created_by: user.id,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template uploaded successfully");
      setFile(null);
      setTemplateName("");
      setTemplateType("");
      setIsDefault(false);
      setIsActive(true);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload template");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (template: any) => {
      await supabase
        .from("document_templates")
        .update({ is_default_cover: false })
        .eq("template_type", template.template_type);

      const { error } = await supabase
        .from("document_templates")
        .update({ is_default_cover: true })
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Default template updated");
    },
    onError: () => {
      toast.error("Failed to update default template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (template: any) => {
      const filePath = template.file_url.split("/document_templates/")[1];
      
      if (filePath) {
        await supabase.storage.from("document_templates").remove([filePath]);
      }

      const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template deleted successfully");
      setDeleteTemplate(null);
    },
    onError: () => {
      toast.error("Failed to delete template");
    },
  });

  const handleUpload = async () => {
    setUploading(true);
    try {
      await uploadMutation.mutateAsync();
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = (template: any) => {
    const fileExt = template.file_name.split('.').pop()?.toLowerCase();
    setPreviewTemplate({ ...template, publicUrl: template.file_url, fileExt });
  };

  const handleEdit = (template: any) => {
    const fileExt = template.file_name.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'docx' || fileExt === 'doc') {
      setEditTemplate({ ...template, publicUrl: template.file_url });
    } else {
      toast.error("Only Word documents (.docx) can be edited");
    }
  };

  const handleGeneratePlaceholderGuide = async (template: any) => {
    setMakingReady(template.id);
    try {
      const placeholderDoc = generatePlaceholderDocument(template.template_type as TemplateType);
      const blob = await Packer.toBlob(placeholderDoc);
      
      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}_placeholders.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Placeholder guide downloaded successfully!");
    } catch (error) {
      console.error("Error generating placeholder guide:", error);
      toast.error("Failed to generate placeholder guide");
    } finally {
      setMakingReady(null);
    }
  };

  const handleDownloadTemplate = (template: any) => {
    const link = document.createElement('a');
    link.href = template.file_url;
    link.download = template.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Template downloaded successfully!");
  };

  const groupedTemplates = TEMPLATE_TYPES.reduce((acc, type) => {
    acc[type.value] = templates.filter(t => t.template_type === type.value);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload New Template</CardTitle>
          <CardDescription>
            Upload Word templates (.docx) with placeholders or static files (PDF/images) for cover pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Monthly Cost Report Template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-type">Template Type *</Label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger id="template-type">
                  <SelectValue placeholder="Select template type" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-file">Template File *</Label>
              <Input
                id="template-file"
                type="file"
                accept=".docx,.doc,.pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Accepts: .docx, .doc (with placeholders), .pdf, .jpg, .png (static cover pages)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-default"
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
              <Label htmlFor="is-default">Set as default for this type</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || !templateName || !templateType || uploading}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Template"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Templates</CardTitle>
          <CardDescription>
            View and manage all your document templates organized by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading templates...</p>
          ) : (
            <div className="space-y-4">
              {TEMPLATE_TYPES.map((type) => {
                const typeTemplates = groupedTemplates[type.value] || [];
                
                return (
                  <Collapsible key={type.value} defaultOpen={typeTemplates.length > 0}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="h-4 w-4" />
                        <span className="font-medium">{type.label}</span>
                        <span className="text-sm text-muted-foreground">({typeTemplates.length})</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4 space-y-2">
                      {typeTemplates.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-4">No templates yet</p>
                      ) : (
                        typeTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{template.name}</h4>
                                {template.is_default_cover && (
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                )}
                                {!template.is_active && (
                                  <span className="text-xs text-muted-foreground">(Inactive)</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {template.file_name} • {new Date(template.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview(template)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadTemplate(template)}
                                title="Download original template"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {(template.file_name.endsWith('.docx') || template.file_name.endsWith('.doc')) && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(template)}
                                    title="Edit document"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGeneratePlaceholderGuide(template)}
                                    disabled={makingReady === template.id}
                                    title="Download placeholder reference guide"
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    {makingReady === template.id ? "Generating..." : "Placeholder Guide"}
                                  </Button>
                                </>
                              )}
                              {!template.is_default_cover && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDefaultMutation.mutate(template)}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteTemplate(template)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                      {type.value !== "cover_page" && typeTemplates.length > 0 && (
                        <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium text-sm">Available Placeholders for {type.label}</span>
                          </div>
                          <PlaceholderQuickCopy templateType={type.value as any} />
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="overflow-auto">
              {previewTemplate.fileExt === "pdf" ? (
                <iframe
                  src={previewTemplate.publicUrl}
                  className="w-full h-[600px] border rounded"
                  title="PDF Preview"
                />
              ) : (previewTemplate.fileExt === "docx" || previewTemplate.fileExt === "doc") ? (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewTemplate.publicUrl)}`}
                  className="w-full h-[600px] border rounded"
                  title="Word Document Preview"
                />
              ) : (
                <img
                  src={previewTemplate.publicUrl}
                  alt={previewTemplate.name}
                  className="max-w-full h-auto"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>


      <WordDocumentEditor
        template={editTemplate}
        open={!!editTemplate}
        onClose={() => setEditTemplate(null)}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["document-templates"] });
          setEditTemplate(null);
        }}
      />

      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTemplate)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};