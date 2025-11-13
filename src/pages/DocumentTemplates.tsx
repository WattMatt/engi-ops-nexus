import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlaceholderQuickCopy } from "@/components/shared/PlaceholderQuickCopy";
import { toast } from "sonner";
import { Upload, Download, Trash2, FileText, Loader2 } from "lucide-react";
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

export default function DocumentTemplates() {
  const { loading: roleLoading, isAdmin, isModerator } = useRoleAccess("moderator");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cover_page_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("cover_page_templates")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("cover_page_templates")
        .getPublicUrl(filePath);

      await supabase
        .from("cover_page_templates")
        .update({ is_default: false })
        .eq("is_default", true);

      const { error: insertError } = await supabase
        .from("cover_page_templates")
        .insert({
          name: file.name,
          file_path: filePath,
          file_url: publicUrl,
          is_default: true,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      setFile(null);
      toast.success("Template uploaded successfully");
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const template = templates.find((t) => t.id === id);
      if (!template) throw new Error("Template not found");

      const { error: storageError } = await supabase.storage
        .from("cover_page_templates")
        .remove([template.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("cover_page_templates")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      setDeleteTarget(null);
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleDownload = async (template: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("cover_page_templates")
        .download(template.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = template.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (error: any) {
      toast.error(`Download failed: ${error.message}`);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isModerator) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Document Templates</h1>
        <p className="text-muted-foreground">Manage Word templates with dynamic placeholders for PDF exports</p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="placeholders">Placeholders</TabsTrigger>
          <TabsTrigger value="guide">Setup Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Template</CardTitle>
              <CardDescription>Upload a Word template (.docx) with placeholder variables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-file">Template File</Label>
                <Input
                  id="template-file"
                  type="file"
                  accept=".docx,.doc"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Template
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Templates</CardTitle>
              <CardDescription>Download or delete uploaded templates</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No templates uploaded yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {template.is_default && <span className="text-primary">Default • </span>}
                              {new Date(template.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(template)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget({ id: template.id, name: template.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="placeholders">
          <Card>
            <CardHeader>
              <CardTitle>Available Placeholders</CardTitle>
              <CardDescription>Copy these placeholders to use in your Word templates</CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderQuickCopy />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle>Template Setup Guide</CardTitle>
              <CardDescription>Learn how to create templates with placeholders and logos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">📝 Text Placeholders</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use curly braces with placeholder names in your Word document. The system will automatically replace these with actual values.
                  </p>
                  <div className="bg-muted p-3 rounded-md">
                    <code className="text-sm">
                      Project: {"{project_name}"}<br />
                      Date: {"{report_date}"}<br />
                      Prepared for: {"{prepared_for_company}"}
                    </code>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🖼️ Logo Placeholders</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    To add logos to your template:
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                    <li>Insert any placeholder image in Word (the image itself doesn't matter)</li>
                    <li>Right-click the image → Select "Edit Alt Text" or "Format Picture"</li>
                    <li>Set the alt text to one of these exact values:</li>
                  </ol>
                  <div className="mt-3 space-y-2 ml-8">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded">company_logo</code>
                      <span className="text-sm text-muted-foreground">→ Your company logo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded">client_logo</code>
                      <span className="text-sm text-muted-foreground">→ Client logo</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    💡 The size of your placeholder image in Word determines the final logo size in the PDF.
                  </p>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">✨ Best Practices</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Use .docx format for best compatibility</li>
                    <li>Test your template with sample data before finalizing</li>
                    <li>Keep placeholder names exactly as shown (case-sensitive)</li>
                    <li>Upload company and client logos in Settings before using logo placeholders</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
