import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UploadTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadTemplateDialog({
  open,
  onOpenChange,
}: UploadTemplateDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateType, setTemplateType] = useState("custom");
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      if (!name.trim()) throw new Error("Template name is required");

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("document-templates")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("document-templates")
        .getPublicUrl(filePath);

      // Insert template record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error: insertError } = await supabase
        .from("document_templates")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          template_type: templateType,
          file_url: publicUrl,
          file_name: file.name,
          created_by: user.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template uploaded successfully");
      onOpenChange(false);
      // Reset form
      setFile(null);
      setName("");
      setDescription("");
      setTemplateType("custom");
    },
    onError: (error: Error) => {
      toast.error("Failed to upload template: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document Template</DialogTitle>
          <DialogDescription>
            Upload a Word document (.docx) with placeholders like {"{{"}project_name{"}}"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Document File *</Label>
            <Input
              id="file"
              type="file"
              accept=".dotx,.docx,.dot,.doc"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Accepts Word templates (.dotx, .dot) and documents (.docx, .doc)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cost Report Template"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this template"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Template Type</Label>
            <Select value={templateType} onValueChange={setTemplateType}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="cost_report">Cost Report</SelectItem>
                <SelectItem value="cable_schedule">Cable Schedule</SelectItem>
                <SelectItem value="tenant_report">Tenant Report</SelectItem>
                <SelectItem value="specification">Specification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Placeholder Format:</p>
            <code className="text-xs block bg-background p-2 rounded">
              {"{{"}project_name{"}}"}
              <br />
              {"{{"}total_cost{"}}"}
              <br />
              {"{{"}date{"}}"}
            </code>
            <p className="text-xs text-muted-foreground">
              Use double curly braces for placeholders in your document
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upload Template
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
