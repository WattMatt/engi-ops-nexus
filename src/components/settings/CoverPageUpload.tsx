import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";

export function CoverPageUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentTemplate } = useQuery({
    queryKey: ["default-cover-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cover_page_templates" as any)
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const fileName = `cover-page-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("cover-page-templates")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Unset any existing default templates
      await supabase
        .from("cover_page_templates" as any)
        .update({ is_default: false })
        .eq("is_default", true);

      // Insert new template record
      const { error: insertError } = await supabase
        .from("cover_page_templates" as any)
        .insert({
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          is_default: true,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success("Cover page template uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["default-cover-template"] });
      setFile(null);
    } catch (error: any) {
      toast.error("Failed to upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF Cover Page Template</CardTitle>
        <CardDescription>
          Upload a custom cover page template for all PDF exports (Cost Reports, Cable Schedules, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentTemplate && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Active Template</p>
              <p className="text-xs text-green-700">{(currentTemplate as any)?.name}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cover-template">Upload New Template</Label>
          <div className="flex gap-2">
            <Input
              id="cover-template"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="flex-1"
            />
            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Accepts images (PNG, JPG) or PDF files. This will be used as the background for PDF cover pages.
          </p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Template Guidelines:</h4>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Use A4 portrait size (210mm × 297mm)</li>
            <li>Leave space for text overlay (title, project name, subtitle)</li>
            <li>Text will be centered at specific positions</li>
            <li>Company logo and details will be added programmatically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
